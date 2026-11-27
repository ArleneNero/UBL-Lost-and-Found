import { UserSession } from '@/types/domain';

export interface RequestStudentOtpInput {
  fullName: string;
  email: string;
  password: string;
}

export interface RequestStudentOtpResult {
  challengeToken: string;
  expiresIn: number;
  extractedNim: string;
  message?: string;
}

export interface RegisterStudentInput {
  fullName: string;
  email: string;
  password: string;
  otp: string;
  challengeToken: string;
}

export interface IAuthService {
  getCurrentUser(): Promise<UserSession | null>;
  loginAsOfficer(email?: string, password?: string): Promise<UserSession>;
  loginAsStudent(
    email?: string,
    passwordOrName?: string,
    studentNumber?: string
  ): Promise<UserSession>;
  requestStudentRegisterOtp(input: RequestStudentOtpInput): Promise<RequestStudentOtpResult>;
  registerStudent(input: RegisterStudentInput): Promise<UserSession>;
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
  logout(): Promise<void>;
}
