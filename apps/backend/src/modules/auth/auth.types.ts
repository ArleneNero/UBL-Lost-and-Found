export interface AuthUser {
  userId: string;
  authUserId: string;
  fullName: string;
  email: string;
  role: "STUDENT" | "OFFICER";
  studentNumber: string | null;
}

export interface OfficerContext {
  user: AuthUser;
  postId: number;
  postName: string;
}

export interface TokenPayload {
  sub: string; // auth_user_id (Neon Better Auth User ID) or challenge_id for OTP challenges
  email?: string;
  name?: string;
  purpose?: string;
  exp?: number;
  iat?: number;
  iss?: string;
}
