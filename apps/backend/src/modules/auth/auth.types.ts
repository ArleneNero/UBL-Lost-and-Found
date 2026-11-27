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
  sub: string; // auth_user_id (Neon Better Auth User ID), challenge_id, or user_id for password reset
  email?: string;
  name?: string;
  purpose?: string;
  jti?: string;
  exp?: number;
  iat?: number;
  iss?: string;
}

export type NimExtractionResult =
  | { valid: true; normalizedEmail: string; nim: string }
  | { valid: false; code: string; message: string; statusCode: number };

export type AuthFailure = {
  success: false;
  code: string;
  message: string;
  statusCode?: number;
  retryAfter?: number;
};
