import bcrypt from "bcryptjs";
import crypto from "crypto";
import { and, desc, eq, gt, isNull, ne, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { users, passwordResetTokens } from "../../db/schema.js";
import { env } from "../../config/env.js";
import { emailService } from "../../services/email.service.js";
import { AppError } from "../../utils/errors.js";
import { jwtService } from "./jwt.service.js";
import { UUID_REGEX } from "./auth.helpers.js";

const PASSWORD_RESET_TTL_SECONDS = 1800; // 30 minutes
const PASSWORD_RESET_COOLDOWN_MS = 60 * 1000; // 60 seconds
export const GENERIC_PASSWORD_RESET_MESSAGE =
  "Jika email terdaftar, tautan pemulihan kata sandi telah dikirim.";

/**
 * Request Password Reset:
 * - Acquires a per-email PostgreSQL advisory lock inside a transaction
 * - Enforces a 60-second DB-backed cooldown per email
 * - Persists a single-use token_id (jti) in password_reset_tokens
 * - Always returns a uniform 200 generic message to prevent account enumeration
 */
export async function requestPasswordReset(
  email: string,
  originUrl?: string
): Promise<{ success: boolean; message: string }> {
  const normalizedEmail = (email || "").trim().toLowerCase();
  const lockKey = `pwd_reset:${normalizedEmail}`;

  const txOutcome = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`);

    const [user] = await tx
      .select({
        userId: users.userId,
        email: users.email,
        fullName: users.fullName,
      })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!user) {
      return { status: "noop" as const };
    }

    const [latestToken] = await tx
      .select({
        tokenId: passwordResetTokens.tokenId,
        createdAt: passwordResetTokens.createdAt,
      })
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, user.userId))
      .orderBy(desc(passwordResetTokens.createdAt))
      .limit(1);

    const now = new Date();
    if (
      latestToken &&
      now.getTime() - latestToken.createdAt.getTime() < PASSWORD_RESET_COOLDOWN_MS
    ) {
      return { status: "cooldown" as const };
    }

    const tokenId = crypto.randomUUID();
    const expiresAt = new Date(now.getTime() + PASSWORD_RESET_TTL_SECONDS * 1000);

    await tx.insert(passwordResetTokens).values({
      tokenId,
      userId: user.userId,
      expiresAt,
    });

    return { status: "issued" as const, user, tokenId };
  });

  if (txOutcome.status !== "issued") {
    return {
      success: true,
      message: GENERIC_PASSWORD_RESET_MESSAGE,
    };
  }

  const { user, tokenId } = txOutcome;
  const resetToken = jwtService.createToken(
    {
      sub: user.userId,
      email: user.email,
      name: user.fullName,
      purpose: "password_reset",
      jti: tokenId,
    },
    PASSWORD_RESET_TTL_SECONDS
  );

  const baseUrl = originUrl || env.FRONTEND_ORIGIN || "https://lostandfound-budiluhur.web.id";
  const cleanBaseUrl = baseUrl.replace(/\/$/, "");
  const resetUrl = `${cleanBaseUrl}/lupa-sandi?token=${resetToken}&email=${encodeURIComponent(
    user.email
  )}`;

  let sent = false;
  try {
    sent = await emailService.sendPasswordResetEmail(user.email, resetUrl, user.fullName);
  } catch (err) {
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.tokenId, tokenId));
    throw err;
  }

  if (!sent) {
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.tokenId, tokenId));
  } else {
    await db
      .update(passwordResetTokens)
      .set({ consumedAt: sql`NOW()` })
      .where(
        and(
          eq(passwordResetTokens.userId, user.userId),
          ne(passwordResetTokens.tokenId, tokenId),
          isNull(passwordResetTokens.consumedAt)
        )
      );
  }

  return {
    success: true,
    message: GENERIC_PASSWORD_RESET_MESSAGE,
  };
}

/**
 * Reset Password:
 * - Validates JWT signature, issuer, expiration, purpose === "password_reset", and UUID sub/jti
 * - Atomically consumes jti in password_reset_tokens inside a DB transaction (single-use)
 * - Verifies that the target user row was actually updated (returns 404 if absent)
 */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{ success: boolean; message: string; code?: string; statusCode?: number }> {
  if (!newPassword || newPassword.length < 8) {
    return {
      success: false,
      code: "INVALID_PASSWORD",
      message: "Kata sandi baru minimal 8 karakter",
      statusCode: 400,
    };
  }

  const payload = jwtService.verifyToken(token);
  if (
    !payload ||
    payload.purpose !== "password_reset" ||
    !UUID_REGEX.test(payload.sub) ||
    typeof payload.jti !== "string" ||
    !UUID_REGEX.test(payload.jti)
  ) {
    return {
      success: false,
      code: "INVALID_TOKEN",
      message: "Tautan pemulihan tidak valid atau sudah kedaluwarsa. Silakan ajukan ulang.",
      statusCode: 400,
    };
  }

  const tokenId = payload.jti;
  const userId = payload.sub;
  const passwordHash = await bcrypt.hash(newPassword, 10);

  try {
    const txResult = await db.transaction(async (tx) => {
      const consumed = await tx
        .update(passwordResetTokens)
        .set({ consumedAt: sql`NOW()` })
        .where(
          and(
            eq(passwordResetTokens.tokenId, tokenId),
            eq(passwordResetTokens.userId, userId),
            isNull(passwordResetTokens.consumedAt),
            gt(passwordResetTokens.expiresAt, sql`NOW()`)
          )
        )
        .returning({ tokenId: passwordResetTokens.tokenId });

      if (consumed.length === 0) {
        return { status: "invalid_token" as const };
      }

      const updatedUsers = await tx
        .update(users)
        .set({ passwordHash })
        .where(eq(users.userId, userId))
        .returning({ userId: users.userId });

      if (updatedUsers.length === 0) {
        throw new AppError("USER_NOT_FOUND", "Akun pengguna tidak ditemukan.", 404);
      }

      return { status: "ok" as const };
    });

    if (txResult.status === "invalid_token") {
      return {
        success: false,
        code: "INVALID_TOKEN",
        message:
          "Tautan pemulihan tidak valid, sudah digunakan, atau sudah kedaluwarsa. Silakan ajukan ulang.",
        statusCode: 400,
      };
    }

    return {
      success: true,
      message: "Kata sandi berhasil diperbarui. Silakan masuk kembali dengan kata sandi baru.",
    };
  } catch (err) {
    if (err instanceof AppError) {
      return {
        success: false,
        code: err.code,
        message: err.message,
        statusCode: err.statusCode,
      };
    }
    throw err;
  }
}
