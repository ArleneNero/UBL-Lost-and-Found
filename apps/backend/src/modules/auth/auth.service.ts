import { db } from "../../db/index.js";
import { users, servicePosts, otpChallenges } from "../../db/schema.js";
import { and, desc, eq, gt, isNull, lt, ne, or, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { AuthUser, TokenPayload } from "./auth.types.js";
import { jwtService, CreateTokenPayload } from "./jwt.service.js";
import { Me, STUDENT_EMAIL_DOMAIN, STRICT_STUDENT_NIM_REGEX } from "./auth.dto.js";
import { emailService } from "../../services/email.service.js";
import { env, resolveRuntimeAuthSecret } from "../../config/env.js";
import { AppError } from "../../utils/errors.js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type NimExtractionResult =
  | { valid: true; normalizedEmail: string; nim: string }
  | { valid: false; code: string; message: string; statusCode: number };

type AuthFailure = {
  success: false;
  code: string;
  message: string;
  statusCode?: number;
  retryAfter?: number;
};

export class AuthService {
  /**
   * Helper to sign a deterministic JWT with HMAC-SHA256 (HS256).
   * Delegated to JwtService for cryptographic separation.
   */
  createToken(
    payload: CreateTokenPayload,
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
   * Strictly validates campus student email domain and extracts exact 10-digit NIM from local-part.
   */
  private extractStrictStudentNim(email: string): NimExtractionResult {
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
  private computeOtpHmac(
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
  private mapPgUniqueViolation(err: unknown): AuthFailure | null {
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
  private async findDuplicateStudent(
    normalizedEmail: string,
    nim: string,
    excludeAuthUserId?: string
  ): Promise<AuthFailure | null> {
    const matches = await db.query.users.findMany({
      where: or(eq(users.email, normalizedEmail), eq(users.studentNumber, nim)),
    });

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
  private toStudentMe(user: typeof users.$inferSelect): Me {
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

  /**
   * B/H.1.0: POST /me/bootstrap
   * Creates a student profile after verified email authentication.
   * Derives authUserId, email, and strict 10-digit NIM strictly from verified session.
   * Never overwrites existing user accounts or roles.
   */
  async bootstrapStudent(
    authUserId: string,
    email: string,
    fullName: string
  ): Promise<{ success: true; data: Me } | AuthFailure> {
    const nimResult = this.extractStrictStudentNim(email);
    if (!nimResult.valid) {
      return {
        success: false,
        code: nimResult.code,
        message: nimResult.message,
        statusCode: nimResult.statusCode,
      };
    }

    const { normalizedEmail, nim } = nimResult;

    const existing = await db.query.users.findFirst({
      where: eq(users.authUserId, authUserId),
    });

    if (existing) {
      if (existing.role !== "STUDENT") {
        return {
          success: false,
          code: "PROFILE_EXISTS",
          message: "Akun sudah memiliki profil terdaftar",
          statusCode: 403,
        };
      }
      return {
        success: false,
        code: "PROFILE_EXISTS",
        message: "Profil mahasiswa sudah terdaftar",
        statusCode: 409,
      };
    }

    const duplicate = await this.findDuplicateStudent(normalizedEmail, nim, authUserId);
    if (duplicate) {
      return duplicate;
    }

    try {
      const [created] = await db
        .insert(users)
        .values({
          authUserId,
          email: normalizedEmail,
          fullName: fullName.trim(),
          studentNumber: nim,
          role: "STUDENT",
        })
        .returning();

      return {
        success: true,
        data: this.toStudentMe(created),
      };
    } catch (err) {
      const uniqueErr = this.mapPgUniqueViolation(err);
      if (uniqueErr) {
        return uniqueErr;
      }
      throw err;
    }
  }

  /**
   * Student Login: Zero-Trust Server-Side Credential & Domain Validation
   * - Verifies email ends with @student.budiluhur.ac.id
   * - Finds student by email strictly with role === 'STUDENT'
   * - Compares password using bcrypt
   * - Issues JWT token and returns verified student profile
   */
  async studentLogin(
    email: string,
    password: string
  ): Promise<
    | { success: true; data: { token: string; user: Me } }
    | AuthFailure
  > {
    const normalizedEmail = (email || "").trim().toLowerCase();
    if (!normalizedEmail.endsWith(STUDENT_EMAIL_DOMAIN)) {
      return {
        success: false,
        code: "INVALID_STUDENT_DOMAIN",
        message: "Hanya email resmi mahasiswa (@student.budiluhur.ac.id) yang diizinkan untuk akun mahasiswa",
        statusCode: 403,
      };
    }

    const user = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
    });

    if (!user || user.role !== "STUDENT" || !user.passwordHash) {
      return {
        success: false,
        code: "INVALID_CREDENTIALS",
        message: "Email atau kata sandi mahasiswa tidak valid",
        statusCode: 401,
      };
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return {
        success: false,
        code: "INVALID_CREDENTIALS",
        message: "Email atau kata sandi mahasiswa tidak valid",
        statusCode: 401,
      };
    }

    const token = this.createToken({
      sub: user.authUserId,
      email: user.email,
      name: user.fullName,
    });

    return {
      success: true,
      data: {
        token,
        user: this.toStudentMe(user),
      },
    };
  }

  /**
   * v1.4.0 Step 1: Request Student Registration OTP (Stateful Neon PostgreSQL Challenge)
   * - Validates campus domain and strict 10-digit NIM local-part
   * - Checks duplicate email and NIM in DB
   * - Enforces 60-second server-side resend cooldown per email
   * - Persists salted HMAC-SHA256 OTP digest in otp_challenges and issues challenge_token (without otpHash/salt)
   * - Delivers OTP exclusively to student's campus email via Resend
   */
  async requestStudentRegisterOtp(
    fullName: string,
    email: string,
    password: string
  ): Promise<
    | {
        success: true;
        data: {
          challenge_token: string;
          expires_in: number;
          extracted_nim: string;
          message: string;
        };
      }
    | AuthFailure
  > {
    const nimResult = this.extractStrictStudentNim(email);
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

    const duplicate = await this.findDuplicateStudent(normalizedEmail, nim);
    if (duplicate) {
      return duplicate;
    }

    const latestChallenge = await db.query.otpChallenges.findFirst({
      where: eq(otpChallenges.email, normalizedEmail),
      orderBy: [desc(otpChallenges.createdAt)],
    });

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
        success: false,
        code: "OTP_COOLDOWN_ACTIVE",
        message: `Mohon tunggu ${remainingSeconds} detik sebelum meminta kode OTP baru.`,
        statusCode: 429,
        retryAfter: remainingSeconds,
      };
    }

    const challengeId = crypto.randomUUID();
    const salt = crypto.randomBytes(16).toString("hex");
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = this.computeOtpHmac(normalizedEmail, otp, challengeId, salt);
    const expiresInSeconds = 600;
    const expiresAt = new Date(now.getTime() + expiresInSeconds * 1000);
    const resendAvailableAt = new Date(now.getTime() + 60 * 1000);

    const challenge_token = this.createToken(
      {
        sub: challengeId,
        email: normalizedEmail,
        purpose: "register_otp",
      },
      expiresInSeconds
    );

    await db.insert(otpChallenges).values({
      challengeId,
      email: normalizedEmail,
      otpSalt: salt,
      otpHash,
      attempts: 0,
      maxAttempts: 5,
      expiresAt,
      resendAvailableAt,
    });

    const sent = await emailService.sendRegistrationOtpEmail(
      normalizedEmail,
      otp,
      fullName.trim(),
      nim
    );

    if (!sent) {
      await db.delete(otpChallenges).where(eq(otpChallenges.challengeId, challengeId));
      return {
        success: false,
        code: "EMAIL_DELIVERY_FAILED",
        message:
          "Gagal mengirim kode OTP ke email kampus Anda. Pastikan alamat email aktif dan coba lagi.",
        statusCode: 502,
      };
    }

    await db
      .update(otpChallenges)
      .set({ lockedAt: new Date() })
      .where(
        and(
          eq(otpChallenges.email, normalizedEmail),
          ne(otpChallenges.challengeId, challengeId),
          isNull(otpChallenges.consumedAt),
          isNull(otpChallenges.lockedAt)
        )
      );

    return {
      success: true,
      data: {
        challenge_token,
        expires_in: expiresInSeconds,
        extracted_nim: nim,
        message: "Kode OTP 6 digit telah dikirim ke email kampus Anda.",
      },
    };
  }

  /**
   * v1.4.0 Step 2: Student Register with Stateful Signed OTP Challenge Verification
   * - Re-validates campus domain and strict 10-digit NIM extraction from email
   * - Verifies challenge_token signature, expiry, purpose === 'register_otp', email binding, and UUID sub
   * - Enforces server-side max 5 attempts lockout and single-use atomic consumption in DB transaction
   * - Hashes password using bcrypt and persists studentNumber extracted strictly from email
   */
  async studentRegister(
    fullName: string,
    email: string,
    password: string,
    otp: string,
    challengeToken: string
  ): Promise<
    | { success: true; data: { token: string; user: Me } }
    | AuthFailure
  > {
    const nimResult = this.extractStrictStudentNim(email);
    if (!nimResult.valid) {
      return {
        success: false,
        code: nimResult.code,
        message: nimResult.message,
        statusCode: nimResult.statusCode,
      };
    }

    const { normalizedEmail, nim } = nimResult;

    const payload = this.verifyToken(challengeToken);
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

    const expectedHash = this.computeOtpHmac(
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

    const duplicate = await this.findDuplicateStudent(normalizedEmail, nim);
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

      const token = this.createToken({
        sub: created.authUserId,
        email: created.email,
        name: created.fullName,
      });

      return {
        success: true,
        data: {
          token,
          user: this.toStudentMe(created),
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
      const uniqueErr = this.mapPgUniqueViolation(err);
      if (uniqueErr) {
        return uniqueErr;
      }
      throw err;
    }
  }

  /**
   * Request Password Reset:
   * Generates a 30-minute secure token and sends email via Resend
   */
  async requestPasswordReset(
    email: string,
    originUrl?: string
  ): Promise<{ success: boolean; message: string }> {
    const normalizedEmail = (email || "").trim().toLowerCase();
    const user = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
    });

    if (!user) {
      // Return success to avoid email enumeration
      return {
        success: true,
        message: "Jika email terdaftar, tautan pemulihan kata sandi telah dikirim.",
      };
    }

    const resetToken = jwtService.createToken(
      {
        sub: user.userId,
        email: user.email,
        name: user.fullName,
        purpose: "password_reset",
      },
      1800 // 30 minutes
    );

    const baseUrl = originUrl || env.FRONTEND_ORIGIN || "https://lostandfound-budiluhur.web.id";
    const cleanBaseUrl = baseUrl.replace(/\/$/, "");
    const resetUrl = `${cleanBaseUrl}/lupa-sandi?token=${resetToken}&email=${encodeURIComponent(
      user.email
    )}`;

    await emailService.sendPasswordResetEmail(user.email, resetUrl, user.fullName);

    return {
      success: true,
      message: "Tautan pemulihan kata sandi telah dikirim ke email mahasiswa Anda.",
    };
  }

  /**
   * Reset Password:
   * Validates the 30-minute token and updates passwordHash with bcrypt
   */
  async resetPassword(
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
    if (!payload || payload.purpose !== "password_reset" || !payload.sub) {
      return {
        success: false,
        code: "INVALID_TOKEN",
        message: "Tautan pemulihan tidak valid atau sudah kedaluwarsa. Silakan ajukan ulang.",
        statusCode: 400,
      };
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.userId, payload.sub));

    return {
      success: true,
      message: "Kata sandi berhasil diperbarui. Silakan masuk kembali dengan kata sandi baru.",
    };
  }
}

export const authService = new AuthService();
