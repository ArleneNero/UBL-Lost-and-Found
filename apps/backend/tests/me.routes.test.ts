import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import { FastifyInstance } from "fastify";
import { authService } from "../src/modules/auth/auth.service.js";
import { db, pool } from "../src/db/index.js";
import { users } from "../src/db/schema.js";
import { eq } from "drizzle-orm";
import { meResponseSchema } from "../src/modules/auth/auth.dto.js";

describe("B/D.2 — Protected API, Profile & Abuse Controls", () => {
  let app: FastifyInstance;
  const testStudentAuthId = "test-student-me-01";
  let testStudentUserId: string;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    // Setup temporary student for testing GET /me student response
    let student = await db.query.users.findFirst({
      where: eq(users.authUserId, testStudentAuthId),
    });

    if (!student) {
      const [newStudent] = await db
        .insert(users)
        .values({
          authUserId: testStudentAuthId,
          fullName: "Budi Mahasiswa",
          email: "budi.mhs@budiluhur.ac.id",
          studentNumber: "2111500888",
          role: "STUDENT",
        })
        .returning();
      student = newStudent;
    }
    testStudentUserId = student.userId;
  });

  afterAll(async () => {
    if (testStudentUserId) {
      await db.delete(users).where(eq(users.userId, testStudentUserId));
    }
    await app.close();
    await pool.end();
  });

  describe("B/D.2.0: GET /api/v1/me Profile Endpoint", () => {
    it("should respond 200 OK with Me DTO for authenticated OFFICER", async () => {
      const token = authService.createToken({ sub: "seed-officer-pengajaran-01" });

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/me",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();

      // Schema validation via Zod
      const parseResult = meResponseSchema.safeParse(json);
      expect(parseResult.success).toBe(true);

      expect(json.data.role).toBe("OFFICER");
      expect(json.data.email).toBe("lostandfound.budiluhur@gmail.com");
      expect(json.data.assigned_post_id).toBe(1); // Pos Pengajaran
      expect(json.data.nim_verification_status).toBe("NOT_VERIFIED");
    });

    it("should respond 200 OK with Me DTO for authenticated STUDENT with assigned_post_id null", async () => {
      const token = authService.createToken({ sub: testStudentAuthId });

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/me",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.data.role).toBe("STUDENT");
      expect(json.data.assigned_post_id).toBeNull();
      expect(json.data.student_number).toBe("2111500888");
      expect(json.data.nim_verification_status).toBe("NOT_VERIFIED");
    });

    it("should return 401 UNAUTHORIZED when no token is supplied", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/me",
      });

      expect(response.statusCode).toBe(401);
      const json = response.json();
      expect(json.error.code).toBe("UNAUTHORIZED");
      expect(json.error).toHaveProperty("request_id");
    });

    it("should return 404 PROFILE_NOT_FOUND when user is in auth but not yet onboarded in DB", async () => {
      const token = authService.createToken({ sub: "unregistered-user-random" });

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/me",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(404);
      const json = response.json();
      expect(json.error.code).toBe("PROFILE_NOT_FOUND");
    });
  });

  describe("B/D.2.1: Officer Provisioning Trust Boundary", () => {
    it("should ensure no public officer registration or promotion endpoints exist", async () => {
      const endpoints = [
        { method: "POST" as const, url: "/api/v1/officer/register" },
        { method: "POST" as const, url: "/api/v1/register/officer" },
        { method: "PATCH" as const, url: "/api/v1/me/role" },
        { method: "POST" as const, url: "/api/v1/admin/promote" },
      ];

      for (const ep of endpoints) {
        const response = await app.inject({
          method: ep.method,
          url: ep.url,
          payload: { role: "OFFICER" },
        });

        // Must be 404 Not Found (no such route in the public API contract)
        expect(response.statusCode).toBe(404);
      }
    });
  });

  describe("B/D.2.2: CORS Preflight & Error Envelope Integrity", () => {
    it("should support CORS preflight OPTIONS request on protected routes", async () => {
      const response = await app.inject({
        method: "OPTIONS",
        url: "/api/v1/me",
        headers: {
          origin: "http://localhost:5173",
          "access-control-request-method": "GET",
          "access-control-request-headers": "authorization",
        },
      });

      expect([200, 204]).toContain(response.statusCode);
      expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
      expect(response.headers["access-control-allow-credentials"]).toBe("true");
    });

    it("should maintain uniform error envelope format { error: { code, message, request_id } }", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/me",
        headers: {
          authorization: "Bearer invalid-token",
        },
      });

      expect(response.statusCode).toBe(401);
      const json = response.json();
      expect(json).toHaveProperty("error");
      expect(json.error).toHaveProperty("code");
      expect(json.error).toHaveProperty("message");
      expect(json.error).toHaveProperty("request_id");
    });
  });
});
