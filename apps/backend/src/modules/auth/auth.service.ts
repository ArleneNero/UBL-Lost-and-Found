import { db } from "../../db/index.js";
import { users, servicePosts } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { AuthUser, TokenPayload } from "./auth.types.js";
import { jwtService } from "./jwt.service.js";
import { Me } from "./auth.dto.js";

export class AuthService {
  /**
   * Helper to sign a deterministic JWT with HMAC-SHA256 (HS256).
   * Delegated to JwtService for cryptographic separation.
   */
  createToken(
    payload: { sub: string; email?: string; name?: string },
    expiresInSeconds: number = 3600
  ): string {
    return jwtService.createToken(payload, expiresInSeconds);
  }

  /**
   * Verifies a Bearer JWT signature, structure, and expiration safely against timing attacks.
   * Delegated to JwtService for cryptographic separation.
   */
  verifyToken(token: string): TokenPayload | null {
    return jwtService.verifyToken(token);
  }

  /**
   * B/D.1.1: Resolves local user from Neon PostgreSQL by auth_user_id (Never trusts role from client)
   */
  async getUserByAuthId(authUserId: string): Promise<AuthUser | null> {
    const user = await db.query.users.findFirst({
      where: eq(users.authUserId, authUserId),
    });

    if (!user) {
      return null;
    }

    return {
      userId: user.userId,
      authUserId: user.authUserId,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      studentNumber: user.studentNumber,
    };
  }

  /**
   * B/D.1.2: Resolves assigned service post for an officer (Pos Pengajaran)
   */
  async getOfficerPost(userId: string): Promise<{ postId: number; name: string } | null> {
    const post = await db.query.servicePosts.findFirst({
      where: eq(servicePosts.officerUserId, userId),
    });

    if (!post) {
      return null;
    }

    return {
      postId: post.postId,
      name: post.name,
    };
  }

  /**
   * Officer Login: Zero-Trust Server-Side Credential & Role Validation
   * - Finds officer by email
   * - Strictly verifies user.role === 'OFFICER'
   * - Compares submitted password with user.passwordHash using bcrypt
   * - Issues JWT token and returns verified officer profile
   */
  async officerLogin(
    email: string,
    password: string
  ): Promise<
    | { success: true; data: { token: string; user: Me } }
    | { success: false; code: string; message: string }
  > {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
    });

    // Zero-Trust: If user not found, or user is not an OFFICER, or no passwordHash set
    if (!user || user.role !== "OFFICER" || !user.passwordHash) {
      return {
        success: false,
        code: "INVALID_CREDENTIALS",
        message: "Email atau kata sandi petugas tidak valid",
      };
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return {
        success: false,
        code: "INVALID_CREDENTIALS",
        message: "Email atau kata sandi petugas tidak valid",
      };
    }

    const post = await this.getOfficerPost(user.userId);
    const token = this.createToken({
      sub: user.authUserId,
      email: user.email,
      name: user.fullName,
    });

    const officerProfile: Me = {
      user_id: user.userId,
      full_name: user.fullName,
      email: user.email,
      student_number: user.studentNumber,
      role: user.role,
      assigned_post_id: post?.postId ?? null,
      nim_verification_status: "NOT_VERIFIED",
    };

    return {
      success: true,
      data: {
        token,
        user: officerProfile,
      },
    };
  }
}

export const authService = new AuthService();
