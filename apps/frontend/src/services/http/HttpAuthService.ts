import {
  IAuthService,
  RegisterStudentInput,
  RequestStudentOtpInput,
  RequestStudentOtpResult,
} from '../contracts/IAuthService';
import { UserSession } from '@/types/domain';
import {
  ApiDataResponse,
  OfficerLoginResponseDto,
  MeDto,
  StudentOtpRequestDto,
  StudentOtpResponseDto,
  StudentRegisterRequestDto,
} from '@/types/api';
import { apiClient, setAuthToken, getAuthToken } from './apiClient';
import { mockStore } from '@/data/mockStore';

export class HttpAuthService implements IAuthService {
  private applyUserSession(user: MeDto): UserSession {
    const session: UserSession = {
      id: user.user_id,
      name: user.full_name,
      email: user.email,
      role: user.role,
      assignedPostId: user.assigned_post_id,
      studentNumber: user.student_number,
    };

    mockStore.getState().currentUser = {
      userId: session.id,
      fullName: session.name,
      email: session.email,
      role: session.role,
      assignedPostId: session.assignedPostId ?? 1,
      studentNumber: session.studentNumber ?? null,
    };

    return session;
  }

  async getCurrentUser(): Promise<UserSession | null> {
    const token = getAuthToken();
    if (!token) {
      return null;
    }

    try {
      const res = await apiClient<ApiDataResponse<MeDto>>('/me');
      return this.applyUserSession(res.data);
    } catch {
      setAuthToken(null);
      mockStore.getState().currentUser = null;
      return null;
    }
  }

  async loginAsOfficer(email?: string, password?: string): Promise<UserSession> {
    const res = await apiClient<ApiDataResponse<OfficerLoginResponseDto>>('/auth/officer-login', {
      method: 'POST',
      body: JSON.stringify({
        email: email || '',
        password: password || '',
      }),
    });

    const { token, user } = res.data;
    setAuthToken(token);
    return this.applyUserSession(user);
  }

  async loginAsStudent(
    email?: string,
    passwordOrName?: string,
    _studentNumber?: string
  ): Promise<UserSession> {
    const res = await apiClient<ApiDataResponse<{ token: string; user: MeDto }>>(
      '/auth/student-login',
      {
        method: 'POST',
        body: JSON.stringify({
          email: email || '',
          password: passwordOrName || '',
        }),
      }
    );

    const { token, user } = res.data;
    setAuthToken(token);
    return this.applyUserSession(user);
  }

  async requestStudentRegisterOtp(input: RequestStudentOtpInput): Promise<RequestStudentOtpResult> {
    const payload: StudentOtpRequestDto = {
      full_name: input.fullName,
      email: input.email,
      password: input.password,
    };

    const res = await apiClient<ApiDataResponse<StudentOtpResponseDto>>(
      '/auth/student-register/request-otp',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );

    const data = res.data;
    return {
      challengeToken: data.challenge_token,
      expiresIn: data.expires_in,
      extractedNim: data.extracted_nim,
      message: data.message,
    };
  }

  async registerStudent(input: RegisterStudentInput): Promise<UserSession> {
    const payload: StudentRegisterRequestDto = {
      full_name: input.fullName,
      email: input.email,
      password: input.password,
      otp: input.otp,
      challenge_token: input.challengeToken,
    };

    const res = await apiClient<ApiDataResponse<{ token: string; user: MeDto }>>(
      '/auth/student-register',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );

    const { token, user } = res.data;
    setAuthToken(token);
    return this.applyUserSession(user);
  }

  async logout(): Promise<void> {
    setAuthToken(null);
    mockStore.getState().currentUser = null;
  }
}
