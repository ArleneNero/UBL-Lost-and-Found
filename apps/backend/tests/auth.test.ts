import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import { authenticate, requireOfficer } from "../src/middleware/auth.guard.js";
import { authService } from "../src/modules/auth/auth.service.js";
import { authRoutes } from "../src/modules/auth/auth.routes.js";
import { emailService } from "../src/services/email.service.js";
import { SEED_OFFICER_EMAIL, SEED_OFFICER_PASSWORD } from "../src/db/fixtures/officer.fixture.js";
import { db, pool } from "../src/db/index.js";
import { users, otpChallenges } from "../src/db/schema.js";
import { eq, inArray, or } from "drizzle-orm";
import { resolveRuntimeAuthSecret } from "../src/config/env.js";
import { AppError } from "../src/utils/errors.js";

describe("B/D.1 — Server-Side Auth, Identity Mapping & Scoped Policy", () => {
  let app: FastifyInstance;
  const testStudentAuthId = "test-student-auth-01";
  let testStudentUserId: string;

  beforeAll(async () => {
    app = Fastify();

    // Uniform Error Envelope Handler
    app.setErrorHandler((error, request, reply) => {
      const statusCode = error.statusCode || 500;
      reply.status(statusCode).send({
        error: {
          code: error.code || "INTERNAL_SERVER_ERROR",
          message: error.message,
          request_id: request.id,
        },
      });
    });

    // Register official authRoutes under /api/v1
    app.register(authRoutes, { prefix: "/api/v1" });

    // Protected Route 1: Any Authenticated User
    app.get("/api/v1/test/protected", { preHandler: [authenticate] }, async (request) => {
      return {
        user: request.currentUser,
      };
    });

    // Protected Route 2: Officer Only with Scoped Pos Context
    app.get("/api/v1/test/officer-only", { preHandler: [requireOfficer] }, async (request) => {
      return {
        officer: request.officerContext,
      };
    });

    await app.ready();

    // Ensure a test student exists for role testing
    let student = await db.query.users.findFirst({
      where: eq(users.authUserId, testStudentAuthId),
    });

    if (!student) {
      const [newStudent] = await db
        .insert(users)
        .values({
          authUserId: testStudentAuthId,
          fullName: "Mahasiswa Uji Coba",
          email: "mahasiswa.test@budiluhur.ac.id",
          studentNumber: "2111509999",
          role: "STUDENT",
        })
        .returning();
      student = newStudent;
    }
    testStudentUserId = student.userId;
  });

  afterAll(async () => {
    // Cleanup test student
    if (testStudentUserId) {
      await db.delete(users).where(eq(users.userId, testStudentUserId));
    }
    await app.close();
    await pool.end();
  });

  describe("B/D.1.0: Neon Better Auth Verifier", () => {
    it("should return 401 UNAUTHORIZED when Authorization header is missing", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/test/protected",
      });

      expect(response.statusCode).toBe(401);
      const json = response.json();
      expect(json.error.code).toBe("UNAUTHORIZED");
      expect(json.error.message).toContain("tidak ditemukan");
      expect(json.error).toHaveProperty("request_id");
    });

    it("should return 401 UNAUTHORIZED when Authorization format is not Bearer", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/test/protected",
        headers: {
          authorization: "Basic 123456",
        },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().error.code).toBe("UNAUTHORIZED");
    });

    it("should return 401 UNAUTHORIZED when token has invalid signature (tampered)", async () => {
      const validToken = authService.createToken({ sub: "seed-officer-pengajaran-01" });
      const tamperedToken = validToken.slice(0, -5) + "abcde";

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/test/protected",
        headers: {
          authorization: `Bearer ${tamperedToken}`,
        },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().error.code).toBe("UNAUTHORIZED");
    });

    it("should return 401 UNAUTHORIZED when token has expired", async () => {
      // Create a token that expired 10 seconds ago
      const expiredToken = authService.createToken(
        { sub: "seed-officer-pengajaran-01" },
        -10 // expired in the past
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/test/protected",
        headers: {
          authorization: `Bearer ${expiredToken}`,
        },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().error.code).toBe("UNAUTHORIZED");
      expect(response.json().error.message).toContain("kedaluwarsa");
    });
  });

  describe("B/D.1.1: Identity Mapping to Neon PostgreSQL", () => {
    it("should return 404 PROFILE_NOT_FOUND when user is authenticated but not in database", async () => {
      const token = authService.createToken({ sub: "unregistered-auth-user-id" });

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/test/protected",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(404);
      const json = response.json();
      expect(json.error.code).toBe("PROFILE_NOT_FOUND");
      expect(json.error.message).toContain("belum terdaftar");
    });

    it("should map identity successfully to local users row for valid officer", async () => {
      const token = authService.createToken({ sub: "seed-officer-pengajaran-01" });

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/test/protected",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.user).toBeDefined();
      expect(json.user.authUserId).toBe("seed-officer-pengajaran-01");
      expect(json.user.email).toBe("lostandfound.budiluhur@gmail.com");
      expect(json.user.role).toBe("OFFICER");
    });
  });

  describe("B/D.1.2: Role and Scoped Pos Policy (RBAC)", () => {
    it("should return 403 FORBIDDEN when STUDENT attempts to access officer-only route", async () => {
      const studentToken = authService.createToken({ sub: testStudentAuthId });

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/test/officer-only",
        headers: {
          authorization: `Bearer ${studentToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
      const json = response.json();
      expect(json.error.code).toBe("FORBIDDEN");
      expect(json.error.message).toContain("Hanya petugas");
    });

    it("should permit OFFICER and resolve assigned service post context (Pos Pengajaran)", async () => {
      const officerToken = authService.createToken({ sub: "seed-officer-pengajaran-01" });

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/test/officer-only",
        headers: {
          authorization: `Bearer ${officerToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.officer).toBeDefined();
      expect(json.officer.user.role).toBe("OFFICER");
      expect(json.officer.postId).toBe(1);
      expect(json.officer.postName).toBe("Pos Pengajaran");
    });
  });

  describe("B/D.2.1: Officer Login Endpoint (POST /api/v1/auth/officer-login)", () => {
    it("should login successfully with valid officer credentials and return token + profile", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/officer-login",
        payload: {
          email: SEED_OFFICER_EMAIL,
          password: SEED_OFFICER_PASSWORD,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toBeDefined();
      expect(body.data.token).toBeDefined();
      expect(typeof body.data.token).toBe("string");
      expect(body.data.user.role).toBe("OFFICER");
      expect(body.data.user.email).toBe(SEED_OFFICER_EMAIL);
      expect(body.data.user.assigned_post_id).toBe(1);

      // Verify that the issued token is accepted by protected endpoints
      const checkResponse = await app.inject({
        method: "GET",
        url: "/api/v1/test/officer-only",
        headers: {
          authorization: `Bearer ${body.data.token}`,
        },
      });
      expect(checkResponse.statusCode).toBe(200);
    });

    it("should reject login with 401 INVALID_CREDENTIALS when password is incorrect", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/officer-login",
        payload: {
          email: SEED_OFFICER_EMAIL,
          password: "wrongPassword123!",
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.error.code).toBe("INVALID_CREDENTIALS");
      expect(body.error.message).toContain("tidak valid");
    });

    it("should reject login with 401 INVALID_CREDENTIALS when officer email does not exist", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/officer-login",
        payload: {
          email: "nonexistent.officer@budiluhur.ac.id",
          password: "anyPassword123!",
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.error.code).toBe("INVALID_CREDENTIALS");
    });

    it("should reject login with 401 when student email attempts officer login (Zero-Trust RBAC)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/officer-login",
        payload: {
          email: "mahasiswa.test@budiluhur.ac.id",
          password: "somePassword123!",
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.error.code).toBe("INVALID_CREDENTIALS");
    });

    it("should reject login with 400 VALIDATION_ERROR when email format is invalid", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/officer-login",
        payload: {
          email: "not-an-email",
          password: "anyPassword",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.message).toContain("Format email tidak valid");
    });

    it("should reject login with 400 VALIDATION_ERROR when password is empty", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/officer-login",
        payload: {
          email: SEED_OFFICER_EMAIL,
          password: "",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.message).toContain("Kata sandi wajib diisi");
    });
  });

  describe("B/H.1.3 & B/H.1.4: Student Registration (Stateful OTP & Strict 10-Digit NIM) and Login", () => {
    const baseSuffix = Date.now().toString().slice(-6);
    const testStudentRegNim = `9901${baseSuffix}`;
    const testStudentRegEmail = `${testStudentRegNim}@student.budiluhur.ac.id`;
    const lockoutEmail = `9902${baseSuffix}@student.budiluhur.ac.id`;
    const cooldownEmail = `9903${baseSuffix}@student.budiluhur.ac.id`;
    const failDeliveryEmail = `9904${baseSuffix}@student.budiluhur.ac.id`;
    const passwordResetNamedEmail = `9905${baseSuffix}@student.budiluhur.ac.id`;
    const trackedEmails = [
      testStudentRegEmail,
      lockoutEmail,
      cooldownEmail,
      failDeliveryEmail,
      passwordResetNamedEmail,
    ];
    const testStudentRegPassword = "Password123!";
    let lastCapturedEmail: string | null = null;
    let lastCapturedOtp: string | null = null;
    let lastCapturedNim: string | null = null;

    beforeEach(async () => {
      lastCapturedEmail = null;
      lastCapturedOtp = null;
      lastCapturedNim = null;
      vi.spyOn(emailService, "sendRegistrationOtpEmail").mockImplementation(
        async (toEmail, otpCode, _fullName, nim) => {
          lastCapturedEmail = toEmail;
          lastCapturedOtp = otpCode;
          lastCapturedNim = nim;
          return true;
        }
      );
      await db.delete(otpChallenges).where(inArray(otpChallenges.email, trackedEmails));
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    afterAll(async () => {
      await db.delete(otpChallenges).where(inArray(otpChallenges.email, trackedEmails));
      await db
        .delete(users)
        .where(or(inArray(users.email, trackedEmails), eq(users.studentNumber, testStudentRegNim)));
    });

    it("should reject request-otp with non-student email domain (403 INVALID_STUDENT_DOMAIN)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/student-register/request-otp",
        payload: {
          full_name: "Bukan Mahasiswa",
          email: "bukan.mhs@gmail.com",
          password: "Password123!",
        },
      });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(body.error.code).toBe("INVALID_STUDENT_DOMAIN");
    });

    it("should reject student register with non-student email domain (403 INVALID_STUDENT_DOMAIN)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/student-register",
        payload: {
          full_name: "Bukan Mahasiswa",
          email: "bukan.mhs@gmail.com",
          password: "Password123!",
          otp: "123456",
          challenge_token: "dummy.challenge.token.with.minimum.length",
        },
      });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(body.error.code).toBe("INVALID_STUDENT_DOMAIN");
    });

    it("should reject request-otp when campus email local-part has < 10 digits (400 INVALID_STUDENT_NIM)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/student-register/request-otp",
        payload: {
          full_name: "NIM Kurang",
          email: "241150219@student.budiluhur.ac.id",
          password: "Password123!",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error.code).toBe("INVALID_STUDENT_NIM");
      expect(body.error.message).toContain("9 angka");
    });

    it("should reject request-otp when campus email local-part has > 10 digits (400 INVALID_STUDENT_NIM)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/student-register/request-otp",
        payload: {
          full_name: "NIM Berlebih",
          email: "24115021940@student.budiluhur.ac.id",
          password: "Password123!",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error.code).toBe("INVALID_STUDENT_NIM");
      expect(body.error.message).toContain("11 angka");
    });

    it("should reject request-otp when campus email local-part contains non-digits (400 INVALID_STUDENT_NIM)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/student-register/request-otp",
        payload: {
          full_name: "Budi Non NIM",
          email: "budi@student.budiluhur.ac.id",
          password: "Password123!",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error.code).toBe("INVALID_STUDENT_NIM");
    });

    it("should reject manually injected student_number on request-otp and student-register (400 VALIDATION_ERROR)", async () => {
      const otpReqRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/student-register/request-otp",
        payload: {
          full_name: "Injected NIM",
          email: testStudentRegEmail,
          password: testStudentRegPassword,
          student_number: "1234567890",
        },
      });

      expect(otpReqRes.statusCode).toBe(400);
      expect(otpReqRes.json().error.code).toBe("VALIDATION_ERROR");

      const regRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/student-register",
        payload: {
          full_name: "Injected NIM",
          email: testStudentRegEmail,
          password: testStudentRegPassword,
          otp: "123456",
          challenge_token: "dummy.challenge.token.with.minimum.length",
          student_number: "1234567890",
        },
      });

      expect(regRes.statusCode).toBe(400);
      expect(regRes.json().error.code).toBe("VALIDATION_ERROR");
    });

    it("should reject student-register when OTP or challenge_token is missing (400 VALIDATION_ERROR)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/student-register",
        payload: {
          full_name: "Tanpa OTP",
          email: testStudentRegEmail,
          password: testStudentRegPassword,
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe("VALIDATION_ERROR");
    });

    it("should reject student-register with wrong OTP (400 INVALID_OTP) or cross-email challenge_token (400 INVALID_OR_EXPIRED_OTP)", async () => {
      const otpRes = await app.inject({
        method: "POST",
        url: "/api/v1/student/register/request-otp",
        payload: {
          full_name: "Mahasiswa Uji OTP",
          email: testStudentRegEmail,
          password: testStudentRegPassword,
        },
      });

      expect(otpRes.statusCode).toBe(200);
      const otpBody = otpRes.json();
      expect(lastCapturedOtp).toMatch(/^\d{6}$/);
      const wrongOtp = lastCapturedOtp === "123456" ? "654321" : "123456";

      // 1. Wrong OTP for matching email
      const wrongOtpRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/student-register",
        payload: {
          full_name: "Mahasiswa Uji OTP",
          email: testStudentRegEmail,
          password: testStudentRegPassword,
          otp: wrongOtp,
          challenge_token: otpBody.data.challenge_token,
        },
      });

      expect(wrongOtpRes.statusCode).toBe(400);
      expect(wrongOtpRes.json().error.code).toBe("INVALID_OTP");

      // 2. Cross-email challenge_token replay attempt
      const crossEmailRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/student-register",
        payload: {
          full_name: "Mahasiswa Uji OTP",
          email: "9800000001@student.budiluhur.ac.id",
          password: testStudentRegPassword,
          otp: lastCapturedOtp,
          challenge_token: otpBody.data.challenge_token,
        },
      });

      expect(crossEmailRes.statusCode).toBe(400);
      expect(crossEmailRes.json().error.code).toBe("INVALID_OR_EXPIRED_OTP");

      // 3. Challenge token cannot be abused as Bearer auth token on protected or bootstrap endpoints
      const abuseProtectedRes = await app.inject({
        method: "GET",
        url: "/api/v1/test/protected",
        headers: {
          authorization: `Bearer ${otpBody.data.challenge_token}`,
        },
      });
      expect(abuseProtectedRes.statusCode).toBe(401);

      const abuseBootstrapRes = await app.inject({
        method: "POST",
        url: "/api/v1/me/bootstrap",
        headers: {
          authorization: `Bearer ${otpBody.data.challenge_token}`,
        },
        payload: {
          full_name: "Bypass Attempt",
        },
      });
      expect(abuseBootstrapRes.statusCode).toBe(401);
    });

    it("should return 502 EMAIL_DELIVERY_FAILED when Resend email delivery fails and NOT trigger cooldown", async () => {
      vi.mocked(emailService.sendRegistrationOtpEmail).mockResolvedValueOnce(false);

      const failRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/student-register/request-otp",
        payload: {
          full_name: "Gagal Email",
          email: failDeliveryEmail,
          password: testStudentRegPassword,
        },
      });

      expect(failRes.statusCode).toBe(502);
      expect(failRes.json().error.code).toBe("EMAIL_DELIVERY_FAILED");

      // Immediate retry should succeed without 429 cooldown because failed delivery deletes challenge row
      const retryRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/student-register/request-otp",
        payload: {
          full_name: "Gagal Email",
          email: failDeliveryEmail,
          password: testStudentRegPassword,
        },
      });

      expect(retryRes.statusCode).toBe(200);
    });

    it("should enforce 60-second server-side resend cooldown (429 OTP_COOLDOWN_ACTIVE) and never embed otpHash/salt in JWT", async () => {
      const firstRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/student-register/request-otp",
        payload: {
          full_name: "Uji Cooldown",
          email: cooldownEmail,
          password: testStudentRegPassword,
        },
      });

      expect(firstRes.statusCode).toBe(200);
      const token = firstRes.json().data.challenge_token as string;
      const decodedPayload = JSON.parse(
        Buffer.from(token.split(".")[1], "base64url").toString("utf8")
      );
      expect(decodedPayload.purpose).toBe("register_otp");
      expect(decodedPayload.email).toBe(cooldownEmail);
      expect(decodedPayload.otpHash).toBeUndefined();
      expect(decodedPayload.otpSalt).toBeUndefined();

      const secondRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/student-register/request-otp",
        payload: {
          full_name: "Uji Cooldown",
          email: cooldownEmail,
          password: testStudentRegPassword,
        },
      });

      expect(secondRes.statusCode).toBe(429);
      const errBody = secondRes.json();
      expect(errBody.error.code).toBe("OTP_COOLDOWN_ACTIVE");
      expect(errBody.error.retry_after).toBeGreaterThan(0);
      expect(secondRes.headers["retry-after"]).toBeDefined();
    });

    it("should lock out OTP challenge after 5 wrong attempts (429 OTP_MAX_ATTEMPTS_EXCEEDED)", async () => {
      const otpRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/student-register/request-otp",
        payload: {
          full_name: "Uji Brute Force",
          email: lockoutEmail,
          password: testStudentRegPassword,
        },
      });

      expect(otpRes.statusCode).toBe(200);
      const challengeToken = otpRes.json().data.challenge_token;
      const validOtp = lastCapturedOtp!;
      const wrongOtp = validOtp === "123456" ? "654321" : "123456";

      for (let attempt = 1; attempt <= 4; attempt++) {
        const res = await app.inject({
          method: "POST",
          url: "/api/v1/auth/student-register",
          payload: {
            full_name: "Uji Brute Force",
            email: lockoutEmail,
            password: testStudentRegPassword,
            otp: wrongOtp,
            challenge_token: challengeToken,
          },
        });
        expect(res.statusCode).toBe(400);
        expect(res.json().error.code).toBe("INVALID_OTP");
        expect(res.json().error.message).toContain(`Sisa percobaan: ${5 - attempt}`);
      }

      // 5th wrong attempt triggers permanent lockout on that challenge
      const fifthRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/student-register",
        payload: {
          full_name: "Uji Brute Force",
          email: lockoutEmail,
          password: testStudentRegPassword,
          otp: wrongOtp,
          challenge_token: challengeToken,
        },
      });
      expect(fifthRes.statusCode).toBe(429);
      expect(fifthRes.json().error.code).toBe("OTP_MAX_ATTEMPTS_EXCEEDED");

      // Even submitting the real OTP afterward must remain locked
      const afterLockRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/student-register",
        payload: {
          full_name: "Uji Brute Force",
          email: lockoutEmail,
          password: testStudentRegPassword,
          otp: validOtp,
          challenge_token: challengeToken,
        },
      });
      expect(afterLockRes.statusCode).toBe(429);
      expect(afterLockRes.json().error.code).toBe("OTP_MAX_ATTEMPTS_EXCEEDED");
    });

    it("should complete full stateful OTP registration flow, extract 10-digit NIM, and reject challenge_token replay (201 -> 400)", async () => {
      const otpRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/student-register/request-otp",
        payload: {
          full_name: "Mahasiswa Terdaftar",
          email: testStudentRegEmail,
          password: testStudentRegPassword,
        },
      });

      expect(otpRes.statusCode).toBe(200);
      const otpBody = otpRes.json();
      expect(otpBody.data.challenge_token).toBeDefined();
      expect(otpBody.data.expires_in).toBe(600);
      expect(otpBody.data.extracted_nim).toBe(testStudentRegNim);
      // Never leak raw OTP in API response
      expect(otpBody.data.otp).toBeUndefined();
      expect(JSON.stringify(otpBody)).not.toContain(lastCapturedOtp!);

      expect(lastCapturedEmail).toBe(testStudentRegEmail);
      expect(lastCapturedNim).toBe(testStudentRegNim);
      expect(lastCapturedOtp).toMatch(/^\d{6}$/);

      const registerRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/student-register",
        payload: {
          full_name: "Mahasiswa Terdaftar",
          email: testStudentRegEmail,
          password: testStudentRegPassword,
          otp: lastCapturedOtp!,
          challenge_token: otpBody.data.challenge_token,
        },
      });

      expect(registerRes.statusCode).toBe(201);
      const body = registerRes.json();
      expect(body.data.token).toBeDefined();
      expect(body.data.user.email).toBe(testStudentRegEmail);
      expect(body.data.user.role).toBe("STUDENT");
      expect(body.data.user.student_number).toBe(testStudentRegNim);
      expect(body.data.user.nim_verification_status).toBe("NOT_VERIFIED");

      // Replaying an already-consumed challenge_token must fail with 400 INVALID_OR_EXPIRED_OTP
      const replayRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/student-register",
        payload: {
          full_name: "Replay Attempt",
          email: testStudentRegEmail,
          password: testStudentRegPassword,
          otp: lastCapturedOtp!,
          challenge_token: otpBody.data.challenge_token,
        },
      });
      expect(replayRes.statusCode).toBe(400);
      expect(replayRes.json().error.code).toBe("INVALID_OR_EXPIRED_OTP");
    });

    it("should reject duplicate email (409 EMAIL_EXISTS) and duplicate NIM (409 STUDENT_NUMBER_EXISTS) on request-otp", async () => {
      const dupEmailRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/student-register/request-otp",
        payload: {
          full_name: "Duplikat Email",
          email: testStudentRegEmail,
          password: "Password123!",
        },
      });

      expect(dupEmailRes.statusCode).toBe(409);
      expect(dupEmailRes.json().error.code).toBe("EMAIL_EXISTS");

      // testStudentUserId in DB has studentNumber "2111509999" with email "mahasiswa.test@budiluhur.ac.id"
      const dupNimRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/student-register/request-otp",
        payload: {
          full_name: "Duplikat NIM",
          email: "2111509999@student.budiluhur.ac.id",
          password: "Password123!",
        },
      });

      expect(dupNimRes.statusCode).toBe(409);
      expect(dupNimRes.json().error.code).toBe("STUDENT_NUMBER_EXISTS");
    });

    it("should successfully login as student with valid credentials (200)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/student-login",
        payload: {
          email: testStudentRegEmail,
          password: testStudentRegPassword,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.token).toBeDefined();
      expect(body.data.user.role).toBe("STUDENT");
      expect(body.data.user.email).toBe(testStudentRegEmail);

      // Verify that the issued token works on protected endpoint
      const protectedRes = await app.inject({
        method: "GET",
        url: "/api/v1/test/protected",
        headers: {
          authorization: `Bearer ${body.data.token}`,
        },
      });
      expect(protectedRes.statusCode).toBe(200);
      expect(protectedRes.json().user.role).toBe("STUDENT");
    });

    it("should reject student login with wrong password (401)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/student-login",
        payload: {
          email: testStudentRegEmail,
          password: "WrongPassword999!",
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.error.code).toBe("INVALID_CREDENTIALS");
    });

    it("should reject student login with non-student email domain (403)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/student-login",
        payload: {
          email: "mhs@gmail.com",
          password: "Password123!",
        },
      });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(body.error.code).toBe("INVALID_STUDENT_DOMAIN");
    });

    it("should NOT lock out a user whose name is 'password_reset', and should enforce purpose='password_reset' and origin allowlist", async () => {
      const [created] = await db
        .insert(users)
        .values({
          authUserId: `test-pr-name-${baseSuffix}`,
          fullName: "password_reset",
          email: passwordResetNamedEmail,
          studentNumber: `9905${baseSuffix}`,
          role: "STUDENT",
        })
        .returning();

      const sessionToken = authService.createToken({
        sub: created.authUserId,
        email: created.email,
        name: created.fullName,
      });

      const protectedRes = await app.inject({
        method: "GET",
        url: "/api/v1/test/protected",
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
      });
      expect(protectedRes.statusCode).toBe(200);
      expect(protectedRes.json().user.fullName).toBe("password_reset");

      // Session token without purpose='password_reset' must be rejected by reset-password
      const rejectResetRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/reset-password",
        payload: {
          token: sessionToken,
          new_password: "NewPassword123!",
        },
      });
      expect(rejectResetRes.statusCode).toBe(400);
      expect(rejectResetRes.json().error.code).toBe("INVALID_TOKEN");

      // Spoofed Origin/Referer must fall back to trusted FRONTEND_ORIGIN
      let capturedResetUrl = "";
      vi.spyOn(emailService, "sendPasswordResetEmail").mockImplementationOnce(
        async (_toEmail, resetUrl) => {
          capturedResetUrl = resetUrl;
          return true;
        }
      );

      const forgotRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/forgot-password",
        headers: {
          origin: "https://evil-phishing.example",
          referer: "https://evil-phishing.example/login",
        },
        payload: {
          email: passwordResetNamedEmail,
        },
      });
      expect(forgotRes.statusCode).toBe(200);
      expect(capturedResetUrl).not.toContain("evil-phishing.example");
      expect(capturedResetUrl).toContain("/lupa-sandi?token=");
    });

    it("should reject /me/bootstrap when token lacks email claim (401) or belongs to an OFFICER (403 without overwriting role)", async () => {
      const noEmailToken = authService.createToken({
        sub: "2411509876",
      });
      const noEmailRes = await app.inject({
        method: "POST",
        url: "/api/v1/me/bootstrap",
        headers: {
          authorization: `Bearer ${noEmailToken}`,
        },
        payload: {
          full_name: "No Email Claim",
        },
      });
      expect(noEmailRes.statusCode).toBe(401);

      // Seeded officer with a campus student-shaped email claim must NOT be downgraded to STUDENT
      const officerSpoofToken = authService.createToken({
        sub: "seed-officer-pengajaran-01",
        email: "2411509876@student.budiluhur.ac.id",
      });
      const officerBootstrapRes = await app.inject({
        method: "POST",
        url: "/api/v1/me/bootstrap",
        headers: {
          authorization: `Bearer ${officerSpoofToken}`,
        },
        payload: {
          full_name: "Attempt Downgrade",
        },
      });
      expect(officerBootstrapRes.statusCode).toBe(403);
      expect(officerBootstrapRes.json().error.code).toBe("PROFILE_EXISTS");

      const officerRow = await db.query.users.findFirst({
        where: eq(users.authUserId, "seed-officer-pengajaran-01"),
      });
      expect(officerRow?.role).toBe("OFFICER");
    });

    it("should throw 503 SERVER_MISCONFIGURED in production when AUTH_SECRET is missing or placeholder", () => {
      const prevSecret = process.env.AUTH_SECRET;
      const prevNodeEnv = process.env.NODE_ENV;

      try {
        process.env.NODE_ENV = "production";
        process.env.AUTH_SECRET = "";
        expect(() => resolveRuntimeAuthSecret()).toThrow(AppError);
        try {
          resolveRuntimeAuthSecret();
        } catch (err) {
          expect(err).toBeInstanceOf(AppError);
          expect((err as AppError).statusCode).toBe(503);
          expect((err as AppError).code).toBe("SERVER_MISCONFIGURED");
        }

        process.env.AUTH_SECRET = "dev-neon-auth-secret-" + "key-min-32-chars-long!";
        expect(() => resolveRuntimeAuthSecret()).toThrow(AppError);
      } finally {
        if (prevSecret === undefined) {
          delete process.env.AUTH_SECRET;
        } else {
          process.env.AUTH_SECRET = prevSecret;
        }
        if (prevNodeEnv === undefined) {
          delete process.env.NODE_ENV;
        } else {
          process.env.NODE_ENV = prevNodeEnv;
        }
      }
    });
  });
});
