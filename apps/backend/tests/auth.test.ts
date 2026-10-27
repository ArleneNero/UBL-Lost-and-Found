import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import { authenticate, requireOfficer } from "../src/middleware/auth.guard.js";
import { authService } from "../src/modules/auth/auth.service.js";
import { authRoutes } from "../src/modules/auth/auth.routes.js";
import { SEED_OFFICER_EMAIL, SEED_OFFICER_PASSWORD } from "../src/db/fixtures/officer.fixture.js";
import { db, pool } from "../src/db/index.js";
import { users } from "../src/db/schema.js";
import { eq } from "drizzle-orm";

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
});
