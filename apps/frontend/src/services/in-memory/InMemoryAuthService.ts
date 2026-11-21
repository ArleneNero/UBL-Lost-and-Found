import { IAuthService, RegisterStudentInput } from '../contracts/IAuthService';
import { UserSession } from '@/types/domain';
import { mockStore } from '@/data/mockStore';

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
    const nim = studentNumber || (email?.match(/^(\d+)/)?.[1]) || '2411502194';
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

  async registerStudent(input: RegisterStudentInput): Promise<UserSession> {
    return this.loginAsStudent(input.email, input.fullName, input.studentNumber);
  }

  async logout(): Promise<void> {
    mockStore.getState().currentUser = null;
  }
}
