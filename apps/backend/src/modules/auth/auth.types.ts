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
  sub: string; // auth_user_id (Neon Better Auth User ID)
  email?: string;
  name?: string;
  exp?: number;
  iat?: number;
  iss?: string;
}
