import { UserSession } from '@/types/domain';

export interface IAuthService {
  getCurrentUser(): Promise<UserSession | null>;
  loginAsOfficer(email?: string, password?: string): Promise<UserSession>;
  loginAsStudent(email?: string): Promise<UserSession>;
  logout(): Promise<void>;
}
