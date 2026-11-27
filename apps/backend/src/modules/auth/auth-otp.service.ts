import crypto from "crypto";
import { and, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { otpChallenges } from "../../db/schema.js";
import { emailService } from "../../services/email.service.js";
import { AuthFailure } from "./auth.types.js";
import { jwtService } from "./jwt.service.js";
import {
  computeOtpHmac,
  extractStrictStudentNim,
  findDuplicateStudent,
} from "./auth.helpers.js";

const OTP_EXPIRES_IN_SECONDS = 600;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

export type RequestOtpResult =
  | {
      success: true;
      data: {
        challenge_token: string;
        expires_in: number;
        extracted_nim: string;
        message: string;
      };
    }
  | AuthFailure;

/**
 * Cleans up a newly inserted OTP challenge and restores any previously active challenges
 * that were locked in the same request when Resend email delivery fails.
 */
async function rollbackFailedOtpDelivery(
  normalizedEmail: string,
  challengeId: string,
  lockedPrevIds: string[]
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${normalizedEmail}))`);
    await tx.delete(otpChallenges).where(eq(otpChallenges.challengeId, challengeId));

    if (lockedPrevIds.length > 0) {
      await tx
        .update(otpChallenges)
        .set({ lockedAt: null })
        .where(
          and(
            inArray(otpChallenges.challengeId, lockedPrevIds),
            isNull(otpChallenges.consumedAt),
            lt(otpChallenges.attempts, otpChallenges.maxAttempts)
          )
        );
    }
  });
}

/**
 * Step 1: Request Student Registration OTP (Stateful Neon PostgreSQL Challenge).
 * Serializes per-email cooldown check, previous challenge locking, and new challenge insertion
 * inside a single DB transaction protected by pg_advisory_xact_lock(hashtext(normalizedEmail)).
 */
export async function requestStudentRegisterOtp(
  fullName: string,
  email: string,
  password: string
): Promise<RequestOtpResult> {
  const nimResult = extractStrictStudentNim(email);
  if (!nimResult.valid) {
    return {
      success: false,
      code: nimResult.code,
      message: nimResult.message,
      statusCode: nimResult.statusCode,
    };
  }

  if (!password || password.length < 8) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      message: "Kata sandi minimal 8 karakter",
      statusCode: 400,
    };
  }

  const { normalizedEmail, nim } = nimResult;

  const txOutcome = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${normalizedEmail}))`);

    const duplicate = await findDuplicateStudent(normalizedEmail, nim, undefined, tx);
    if (duplicate) {
      return { status: "failure" as const, failure: duplicate };
    }

    const [latestChallenge] = await tx
      .select()
      .from(otpChallenges)
      .where(eq(otpChallenges.email, normalizedEmail))
      .orderBy(desc(otpChallenges.createdAt))
      .limit(1);

    const now = new Date();
    if (
      latestChallenge &&
      !latestChallenge.consumedAt &&
      latestChallenge.resendAvailableAt > now
    ) {
      const remainingSeconds = Math.max(
        1,
        Math.ceil((latestChallenge.resendAvailableAt.getTime() - now.getTime()) / 1000)
      );
      return {
        status: "failure" as const,
        failure: {
          success: false as const,
          code: "OTP_COOLDOWN_ACTIVE",
          message: `Mohon tunggu ${remainingSeconds} detik sebelum meminta kode OTP baru.`,
          statusCode: 429,
          retryAfter: remainingSeconds,
        },
      };
    }

    const challengeId = crypto.randomUUID();
    const salt = crypto.randomBytes(16).toString("hex");
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = computeOtpHmac(normalizedEmail, otp, challengeId, salt);
    const expiresAt = new Date(now.getTime() + OTP_EXPIRES_IN_SECONDS * 1000);
    const resendAvailableAt = new Date(now.getTime() + OTP_RESEND_COOLDOWN_MS);

    const challengeToken = jwtService.createToken(
      {
        sub: challengeId,
        email: normalizedEmail,
        purpose: "register_otp",
      },
      OTP_EXPIRES_IN_SECONDS
    );

    const lockedPrevRows = await tx
      .update(otpChallenges)
      .set({ lockedAt: now })
      .where(
        and(
          eq(otpChallenges.email, normalizedEmail),
          isNull(otpChallenges.consumedAt),
          isNull(otpChallenges.lockedAt)
        )
      )
      .returning({ challengeId: otpChallenges.challengeId });

    await tx.insert(otpChallenges).values({
      challengeId,
      email: normalizedEmail,
      otpSalt: salt,
      otpHash,
      attempts: 0,
      maxAttempts: 5,
      expiresAt,
      resendAvailableAt,
    });

    return {
      status: "created" as const,
      challengeId,
      otp,
      challengeToken,
      lockedPrevIds: lockedPrevRows.map((row) => row.challengeId),
    };
  });

  if (txOutcome.status === "failure") {
    return txOutcome.failure;
  }

  let sent = false;
  try {
    sent = await emailService.sendRegistrationOtpEmail(
      normalizedEmail,
      txOutcome.otp,
      fullName.trim(),
      nim
    );
  } catch (err) {
    await rollbackFailedOtpDelivery(
      normalizedEmail,
      txOutcome.challengeId,
      txOutcome.lockedPrevIds
    );
    throw err;
  }

  if (!sent) {
    await rollbackFailedOtpDelivery(
      normalizedEmail,
      txOutcome.challengeId,
      txOutcome.lockedPrevIds
    );
    return {
      success: false,
      code: "EMAIL_DELIVERY_FAILED",
      message:
        "Gagal mengirim kode OTP ke email kampus Anda. Pastikan alamat email aktif dan coba lagi.",
      statusCode: 502,
    };
  }

  return {
    success: true,
    data: {
      challenge_token: txOutcome.challengeToken,
      expires_in: OTP_EXPIRES_IN_SECONDS,
      extracted_nim: nim,
      message: "Kode OTP 6 digit telah dikirim ke email kampus Anda.",
    },
  };
}
