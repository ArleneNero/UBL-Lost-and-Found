import bcrypt from "bcryptjs";
import crypto from "crypto";
import { and, eq, gt, isNull, lt, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { users, otpChallenges } from "../../db/schema.js";
import { AppError } from "../../utils/errors.js";
import { Me } from "./auth.dto.js";
import { AuthFailure } from "./auth.types.js";
import { jwtService } from "./jwt.service.js";
import {
  UUID_REGEX,
  computeOtpHmac,
  extractStrictStudentNim,
  findDuplicateStudent,
  mapPgUniqueViolation,
  toStudentMe,
} from "./auth.helpers.js";

export type StudentRegisterResult =
  | { success: true; data: { token: string; user: Me } }
  | AuthFailure;

/**
 * Step 2: Student Register with Stateful Signed OTP Challenge Verification.
 */
export async function studentRegister(
  fullName: string,
  email: string,
  password: string,
  otp: string,
  challengeToken: string
): Promise<StudentRegisterResult> {
  const nimResult = extractStrictStudentNim(email);
  if (!nimResult.valid) {
    return {
      success: false,
      code: nimResult.code,
      message: nimResult.message,
      statusCode: nimResult.statusCode,
    };
  }

  const { normalizedEmail, nim } = nimResult;

  const payload = jwtService.verifyToken(challengeToken);
  if (
    !payload ||
    payload.purpose !== "register_otp" ||
    payload.email !== normalizedEmail ||
    !UUID_REGEX.test(payload.sub)
  ) {
    return {
      success: false,
      code: "INVALID_OR_EXPIRED_OTP",
      message:
        "Token tantangan OTP tidak valid atau sudah kedaluwarsa. Silakan minta kode OTP baru.",
      statusCode: 400,
    };
  }

  const challenge = await db.query.otpChallenges.findFirst({
    where: and(
      eq(otpChallenges.challengeId, payload.sub),
      eq(otpChallenges.email, normalizedEmail)
    ),
  });

  const now = new Date();
  if (!challenge || challenge.consumedAt !== null || challenge.expiresAt <= now) {
    return {
      success: false,
      code: "INVALID_OR_EXPIRED_OTP",
      message:
        "Token tantangan OTP tidak valid atau sudah kedaluwarsa. Silakan minta kode OTP baru.",
      statusCode: 400,
    };
  }

  if (challenge.lockedAt !== null || challenge.attempts >= challenge.maxAttempts) {
    return {
      success: false,
      code: "OTP_MAX_ATTEMPTS_EXCEEDED",
      message:
        "Terlalu banyak percobaan OTP salah (maksimal 5x). Silakan minta ulang kode OTP baru.",
      statusCode: 429,
    };
  }

  const expectedHash = computeOtpHmac(
    normalizedEmail,
    otp.trim(),
    challenge.challengeId,
    challenge.otpSalt
  );
  const storedHashBuf = Buffer.from(challenge.otpHash, "utf8");
  const expectedHashBuf = Buffer.from(expectedHash, "utf8");

  if (
    storedHashBuf.length !== expectedHashBuf.length ||
    !crypto.timingSafeEqual(storedHashBuf, expectedHashBuf)
  ) {
    const [updated] = await db
      .update(otpChallenges)
      .set({
        attempts: sql`${otpChallenges.attempts} + 1`,
        lockedAt: sql`CASE WHEN ${otpChallenges.attempts} + 1 >= ${otpChallenges.maxAttempts} THEN NOW() ELSE ${otpChallenges.lockedAt} END`,
      })
      .where(
        and(
          eq(otpChallenges.challengeId, challenge.challengeId),
          isNull(otpChallenges.consumedAt),
          isNull(otpChallenges.lockedAt),
          lt(otpChallenges.attempts, otpChallenges.maxAttempts)
        )
      )
      .returning();

    if (!updated || updated.lockedAt !== null || updated.attempts >= updated.maxAttempts) {
      return {
        success: false,
        code: "OTP_MAX_ATTEMPTS_EXCEEDED",
        message:
          "Terlalu banyak percobaan OTP salah (maksimal 5x). Silakan minta ulang kode OTP baru.",
        statusCode: 429,
      };
    }

    const remaining = updated.maxAttempts - updated.attempts;
    return {
      success: false,
      code: "INVALID_OTP",
      message: `Kode OTP tidak sesuai. Sisa percobaan: ${remaining}.`,
      statusCode: 400,
    };
  }

  const duplicate = await findDuplicateStudent(normalizedEmail, nim);
  if (duplicate) {
    return duplicate;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const created = await db.transaction(async (tx) => {
      const consumed = await tx
        .update(otpChallenges)
        .set({ consumedAt: sql`NOW()` })
        .where(
          and(
            eq(otpChallenges.challengeId, challenge.challengeId),
            eq(otpChallenges.email, normalizedEmail),
            isNull(otpChallenges.consumedAt),
            isNull(otpChallenges.lockedAt),
            gt(otpChallenges.expiresAt, sql`NOW()`),
            lt(otpChallenges.attempts, otpChallenges.maxAttempts)
          )
        )
        .returning({ challengeId: otpChallenges.challengeId });

      if (consumed.length === 0) {
        throw new AppError(
          "INVALID_OR_EXPIRED_OTP",
          "Token tantangan OTP tidak valid atau sudah digunakan. Silakan minta kode OTP baru.",
          400
        );
      }

      const [insertedUser] = await tx
        .insert(users)
        .values({
          authUserId: `student-${crypto.randomUUID()}`,
          email: normalizedEmail,
          fullName: fullName.trim(),
          studentNumber: nim,
          passwordHash,
          role: "STUDENT",
        })
        .returning();

      return insertedUser;
    });

    const token = jwtService.createToken({
      sub: created.authUserId,
      email: created.email,
      name: created.fullName,
    });

    return {
      success: true,
      data: {
        token,
        user: toStudentMe(created),
      },
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
    const uniqueErr = mapPgUniqueViolation(err);
    if (uniqueErr) {
      return uniqueErr;
    }
    throw err;
  }
}
