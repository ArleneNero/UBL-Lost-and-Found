import { db } from "../../db/index.js";
import { users, servicePosts } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { AuthUser, TokenPayload } from "./auth.types.js";
import { jwtService } from "./jwt.service.js";

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
}

export const authService = new AuthService();
