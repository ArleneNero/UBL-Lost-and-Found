import {
  IAuthService,
  RegisterStudentInput,
  RequestStudentOtpInput,
  RequestStudentOtpResult,
} from '../contracts/IAuthService';
import { UserSession } from '@/types/domain';
import { mockStore, MockState } from '@/data/mockStore';
import { validateAndExtractStudentNim } from '@/features/auth/utils/studentEmailNim';

interface OtpChallengeStore {
  attemptsByEmail: Map<string, number>;
  consumedChallenges: Set<string>;
}

const MAX_OTP_ATTEMPTS = 5;
const otpStoreByState = new WeakMap<MockState, OtpChallengeStore>();

function getOtpChallengeStore(): OtpChallengeStore {
  const state = mockStore.getState();
  let store = otpStoreByState.get(state);
  if (!store) {
    store = {
      attemptsByEmail: new Map<string, number>(),
      consumedChallenges: new Set<string>(),
    };
    otpStoreByState.set(state, store);
  }
  return store;
}

export class InMemoryAuthService implements IAuthService {
  async getCurrentUser(): Promise<UserSession | null> {
    const u = mockStore.getState().currentUser;
    if (!u) return null;
    return {
      id: u.userId,
      name: u.fullName,
      email: u.email,
      role: u.role,
      assignedPostId: u.assignedPostId,
      studentNumber: u.studentNumber,
    };
  }

  async loginAsOfficer(email?: string, _password?: string): Promise<UserSession> {
    const user: UserSession = {
      id: 'officer-01',
      name: 'Petugas Pos Pengajaran',
      email: email || 'petugas.pengajaran@budiluhur.ac.id',
      role: 'OFFICER',
      assignedPostId: 1,
    };

    mockStore.getState().currentUser = {
      userId: user.id,
      fullName: user.name,
      email: user.email,
      role: user.role,
      assignedPostId: user.assignedPostId || 1,
      studentNumber: null,
    };

    return user;
  }

  async loginAsStudent(
    email?: string,
    name?: string,
    studentNumber?: string
  ): Promise<UserSession> {
    const nim = studentNumber || email?.match(/^(\d+)/)?.[1] || '2411502194';
    const user: UserSession = {
      id: `student-${nim}`,
      name: name || 'Nero',
      email: email || `${nim}@student.budiluhur.ac.id`,
      role: 'STUDENT',
      studentNumber: nim,
    };

    mockStore.getState().currentUser = {
      userId: user.id,
      fullName: user.name,
      email: user.email,
      role: user.role,
      assignedPostId: null,
      studentNumber: user.studentNumber || '2411502194',
    };

    return user;
  }

  async requestStudentRegisterOtp(input: RequestStudentOtpInput): Promise<RequestStudentOtpResult> {
    const trimmedName = input.fullName.trim();
    if (!trimmedName) {
      throw new Error('Nama lengkap wajib diisi.');
    }
    if (trimmedName.length < 2) {
      throw new Error('Nama lengkap minimal 2 karakter.');
    }
    if (trimmedName.length > 120) {
      throw new Error('Nama lengkap maksimal 120 karakter.');
    }
    if (input.password.length < 8) {
      throw new Error('Kata sandi minimal 8 karakter.');
    }

    const emailResult = validateAndExtractStudentNim(input.email);
    if (!emailResult.valid) {
      throw new Error(emailResult.error);
    }

    const challengeToken = `mock-challenge-${emailResult.nim}`;
    const challengeStore = getOtpChallengeStore();
    challengeStore.attemptsByEmail.set(emailResult.normalizedEmail, 0);
    challengeStore.consumedChallenges.delete(challengeToken);

    return {
      challengeToken,
      expiresIn: 600,
      extractedNim: emailResult.nim,
      message: 'Kode OTP verifikasi telah dikirim ke email kampus Anda.',
    };
  }

  async registerStudent(input: RegisterStudentInput): Promise<UserSession> {
    const trimmedName = input.fullName.trim();
    if (!trimmedName) {
      throw new Error('Nama lengkap wajib diisi.');
    }
    if (trimmedName.length < 2) {
      throw new Error('Nama lengkap minimal 2 karakter.');
    }
    if (trimmedName.length > 120) {
      throw new Error('Nama lengkap maksimal 120 karakter.');
    }

    const emailResult = validateAndExtractStudentNim(input.email);
    if (!emailResult.valid) {
      throw new Error(emailResult.error);
    }

    const expectedChallengeToken = `mock-challenge-${emailResult.nim}`;
    if (!input.challengeToken || input.challengeToken !== expectedChallengeToken) {
      throw new Error(
        'Sesi verifikasi OTP tidak valid atau tidak sesuai. Silakan kirim ulang kode OTP.'
      );
    }

    const challengeStore = getOtpChallengeStore();
    if (challengeStore.consumedChallenges.has(input.challengeToken)) {
      throw new Error(
        'Kode OTP sudah pernah digunakan atau kedaluwarsa. Silakan kirim ulang kode OTP.'
      );
    }

    const currentAttempts = challengeStore.attemptsByEmail.get(emailResult.normalizedEmail) ?? 0;
    if (currentAttempts >= MAX_OTP_ATTEMPTS) {
      throw new Error('Terlalu banyak percobaan OTP gagal. Silakan minta ulang kode OTP.');
    }

    if (!input.otp || !/^\d{6}$/.test(input.otp)) {
      challengeStore.attemptsByEmail.set(emailResult.normalizedEmail, currentAttempts + 1);
      throw new Error('Kode OTP wajib berupa 6 digit angka.');
    }

    if (input.otp !== '123456') {
      challengeStore.attemptsByEmail.set(emailResult.normalizedEmail, currentAttempts + 1);
      throw new Error('Kode OTP salah. Periksa kembali kode 6 digit dari email kampus Anda.');
    }

    challengeStore.consumedChallenges.add(input.challengeToken);
    challengeStore.attemptsByEmail.delete(emailResult.normalizedEmail);

    return this.loginAsStudent(emailResult.normalizedEmail, trimmedName, emailResult.nim);
  }

  async logout(): Promise<void> {
    mockStore.getState().currentUser = null;
  }
}
