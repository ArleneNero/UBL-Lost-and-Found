import crypto from "crypto";
import { eq, or } from "drizzle-orm";
import { db, DbClient, DbTransaction } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { resolveRuntimeAuthSecret } from "../../config/env.js";
import { Me, STUDENT_EMAIL_DOMAIN, STRICT_STUDENT_NIM_REGEX } from "./auth.dto.js";
import { AuthFailure, NimExtractionResult } from "./auth.types.js";

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Pre-computed cost-10 bcrypt hash used to equalize login response timing
 * when a target account is absent, lacks a passwordHash, or mismatches role.
 */
export const DUMMY_BCRYPT_HASH =
  "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

/**
 * Strictly validates campus student email domain and extracts exact 10-digit NIM from local-part.
 */
export function extractStrictStudentNim(email: string): NimExtractionResult {
  const normalizedEmail = (email || "").trim().toLowerCase();
  if (!normalizedEmail.endsWith(STUDENT_EMAIL_DOMAIN)) {
    return {
      valid: false,
      code: "INVALID_STUDENT_DOMAIN",
      message:
        "Hanya email resmi mahasiswa (@student.budiluhur.ac.id) yang diizinkan untuk akun mahasiswa",
      statusCode: 403,
    };
  }

  const localPart = normalizedEmail.slice(
    0,
    normalizedEmail.length - STUDENT_EMAIL_DOMAIN.length
  );

  if (!STRICT_STUDENT_NIM_REGEX.test(localPart)) {
    const message = /^\d+$/.test(localPart)
      ? `NIM pada email kampus harus tepat 10 angka (terdeteksi ${localPart.length} angka). Contoh: 2411502194@student.budiluhur.ac.id`
      : "Bagian sebelum @ pada email kampus harus berupa tepat 10 angka NIM tanpa huruf atau simbol. Contoh: 2411502194@student.budiluhur.ac.id";
    return {
      valid: false,
      code: "INVALID_STUDENT_NIM",
      message,
      statusCode: 400,
    };
  }

  return {
    valid: true,
    normalizedEmail,
    nim: localPart,
  };
}

/**
 * Computes a deterministic HMAC-SHA256 digest binding an OTP code to challengeId, email, and per-challenge salt.
 */
export function computeOtpHmac(
  email: string,
  otp: string,
  challengeId: string,
  salt: string
): string {
  return crypto
    .createHmac("sha256", resolveRuntimeAuthSecret())
    .update(`${challengeId}:${email}:${otp}:${salt}`)
    .digest("hex");
}

/**
 * Maps PostgreSQL unique constraint violation (23505) to deterministic 409 API errors.
 */
export function mapPgUniqueViolation(err: unknown): AuthFailure | null {
  const candidate = err as {
    code?: string;
    constraint?: string;
    detail?: string;
    cause?: { code?: string; constraint?: string; detail?: string };
  };
  const code = candidate?.code ?? candidate?.cause?.code;
  if (code !== "23505") {
    return null;
  }

  const constraint = (candidate?.constraint ?? candidate?.cause?.constraint ?? "").toLowerCase();
  const detail = (candidate?.detail ?? candidate?.cause?.detail ?? "").toLowerCase();

  if (constraint.includes("student_number") || detail.includes("student_number")) {
    return {
      success: false,
      code: "STUDENT_NUMBER_EXISTS",
      message: "NIM mahasiswa sudah terdaftar",
      statusCode: 409,
    };
  }

  return {
    success: false,
    code: "EMAIL_EXISTS",
    message: "Email mahasiswa sudah terdaftar",
    statusCode: 409,
  };
}

/**
 * Checks whether email or NIM already belongs to another user record in a single query.
 */
export async function findDuplicateStudent(
  normalizedEmail: string,
  nim: string,
  excludeAuthUserId?: string,
  client: DbClient | DbTransaction = db
): Promise<AuthFailure | null> {
  const matches = await client
    .select({
      authUserId: users.authUserId,
      email: users.email,
      studentNumber: users.studentNumber,
    })
    .from(users)
    .where(or(eq(users.email, normalizedEmail), eq(users.studentNumber, nim)));

  const filtered = excludeAuthUserId
    ? matches.filter((u) => u.authUserId !== excludeAuthUserId)
    : matches;

  if (filtered.some((u) => u.email === normalizedEmail)) {
    return {
      success: false,
      code: "EMAIL_EXISTS",
      message: "Email mahasiswa sudah terdaftar",
      statusCode: 409,
    };
  }

  if (filtered.some((u) => u.studentNumber === nim)) {
    return {
      success: false,
      code: "STUDENT_NUMBER_EXISTS",
      message: "NIM mahasiswa sudah terdaftar",
      statusCode: 409,
    };
  }

  return null;
}

/**
 * Maps a student database row into the canonical OpenAPI Me DTO.
 */
export function toStudentMe(user: typeof users.$inferSelect): Me {
  return {
    user_id: user.userId,
    full_name: user.fullName,
    email: user.email,
    student_number: user.studentNumber,
    role: user.role,
    assigned_post_id: null,
    nim_verification_status: "NOT_VERIFIED",
  };
}
