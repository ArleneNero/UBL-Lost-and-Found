import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import { authService } from "../src/modules/auth/auth.service.js";
import { uploadsService } from "../src/modules/uploads/uploads.service.js";
import { db, pool } from "../src/db/index.js";
import { users } from "../src/db/schema.js";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";

describe("Uploads Routes & Storage Pipeline (Milestone B/E)", () => {
  let app: FastifyInstance;
  let officerToken: string;
  let studentToken: string;
  let otherOfficerToken: string;
  let officerUserId: string;
  let studentUserId: string;
  let otherOfficerUserId: string;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    // 1. Resolve seeded Officer
    const officer = await db.query.users.findFirst({
      where: eq(users.authUserId, "seed-officer-pengajaran-01"),
    });
    if (!officer) {
      throw new Error("Seeded officer not found. Run db:seed first.");
    }
    officerUserId = officer.userId;
    officerToken = authService.createToken({ sub: officer.authUserId });

    // 2. Ensure test Student exists
    let student = await db.query.users.findFirst({
      where: eq(users.authUserId, "test-student-upload-01"),
    });
    if (!student) {
      const [inserted] = await db
        .insert(users)
        .values({
          authUserId: "test-student-upload-01",
          fullName: "Mahasiswa Uji Upload",
          email: "mahasiswa.upload@budiluhur.ac.id",
          studentNumber: "2112500888",
          role: "STUDENT",
        })
        .returning();
      student = inserted;
    }
    studentUserId = student.userId;
    studentToken = authService.createToken({ sub: student.authUserId });

    // 3. Ensure secondary Officer exists for IDOR tests
    let otherOfficer = await db.query.users.findFirst({
      where: eq(users.authUserId, "test-other-officer-upload-02"),
    });
    if (!otherOfficer) {
      const [inserted] = await db
        .insert(users)
        .values({
          authUserId: "test-other-officer-upload-02",
          fullName: "Petugas Sekunder",
          email: "petugas.sekunder@budiluhur.ac.id",
          role: "OFFICER",
        })
        .returning();
      otherOfficer = inserted;
    }
    otherOfficerUserId = otherOfficer.userId;
    otherOfficerToken = authService.createToken({ sub: otherOfficer.authUserId });
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  describe("Submilestone B/E.1 — POST /api/v1/uploads/intents", () => {
    it("returns 401 UNAUTHORIZED when no authorization header is provided", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/uploads/intents",
        payload: {
          purpose: "ITEM_PHOTO",
          content_type: "image/jpeg",
          size_bytes: 50000,
        },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe("UNAUTHORIZED");
      expect(body.error.request_id).toBeDefined();
    });

    it("returns 403 FORBIDDEN when STUDENT requests ITEM_PHOTO", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/uploads/intents",
        headers: {
          authorization: `Bearer ${studentToken}`,
        },
        payload: {
          purpose: "ITEM_PHOTO",
          content_type: "image/jpeg",
          size_bytes: 50000,
        },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe("FORBIDDEN");
    });

    it("returns 403 FORBIDDEN when OFFICER requests REPORT_PHOTO", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/uploads/intents",
        headers: {
          authorization: `Bearer ${officerToken}`,
        },
        payload: {
          purpose: "REPORT_PHOTO",
          content_type: "image/jpeg",
          size_bytes: 50000,
        },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe("FORBIDDEN");
    });

    it("returns 422 VALIDATION_ERROR for invalid MIME type (image/gif)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/uploads/intents",
        headers: {
          authorization: `Bearer ${officerToken}`,
        },
        payload: {
          purpose: "ITEM_PHOTO",
          content_type: "image/gif",
          size_bytes: 50000,
        },
      });

      expect(res.statusCode).toBe(422);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 422 VALIDATION_ERROR for size exceeding 5 MiB", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/uploads/intents",
        headers: {
          authorization: `Bearer ${officerToken}`,
        },
        payload: {
          purpose: "ITEM_PHOTO",
          content_type: "image/png",
          size_bytes: 5 * 1024 * 1024 + 1,
        },
      });

      expect(res.statusCode).toBe(422);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 201 CREATED for OFFICER requesting ITEM_PHOTO with 5-minute expiry", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/uploads/intents",
        headers: {
          authorization: `Bearer ${officerToken}`,
        },
        payload: {
          purpose: "ITEM_PHOTO",
          content_type: "image/jpeg",
          size_bytes: 200000, // 200 KiB
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data).toBeDefined();
      expect(body.data.upload_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
      expect(body.data.put_url).toBeDefined();
      expect(body.data.required_headers).toEqual({
        "Content-Type": "image/jpeg",
      });

      // Verify TTL is roughly 5 minutes from now
      const expiresAt = new Date(body.data.expires_at).getTime();
      const diffMinutes = (expiresAt - Date.now()) / (1000 * 60);
      expect(diffMinutes).toBeGreaterThanOrEqual(4.8);
      expect(diffMinutes).toBeLessThanOrEqual(5.2);
    });

    it("returns 201 CREATED for STUDENT requesting REPORT_PHOTO", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/uploads/intents",
        headers: {
          authorization: `Bearer ${studentToken}`,
        },
        payload: {
          purpose: "REPORT_PHOTO",
          content_type: "image/webp",
          size_bytes: 300000,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.upload_id).toBeDefined();
      expect(body.data.required_headers).toEqual({
        "Content-Type": "image/webp",
      });
    });
  });

  describe("Submilestone B/E.1.2 & B/E.2 — Signed PUT and Finalize Pipeline", () => {
    it("returns 404 OBJECT_NOT_FOUND when finalizing an upload that has not been PUT yet", async () => {
      // 1. Create intent
      const intentRes = await app.inject({
        method: "POST",
        url: "/api/v1/uploads/intents",
        headers: { authorization: `Bearer ${officerToken}` },
        payload: {
          purpose: "ITEM_PHOTO",
          content_type: "image/png",
          size_bytes: 10000,
        },
      });
      const intentData = JSON.parse(intentRes.body).data;

      // 2. Finalize immediately without PUT
      const finalizeRes = await app.inject({
        method: "POST",
        url: `/api/v1/uploads/${intentData.upload_id}/finalize`,
        headers: { authorization: `Bearer ${officerToken}` },
      });

      expect(finalizeRes.statusCode).toBe(404);
      const body = JSON.parse(finalizeRes.body);
      expect(body.error.code).toBe("OBJECT_NOT_FOUND");
    });

    it("returns 403 FORBIDDEN when user B attempts to finalize user A's upload (IDOR check)", async () => {
      // 1. Officer A creates intent
      const intentRes = await app.inject({
        method: "POST",
        url: "/api/v1/uploads/intents",
        headers: { authorization: `Bearer ${officerToken}` },
        payload: {
          purpose: "ITEM_PHOTO",
          content_type: "image/jpeg",
          size_bytes: 20000,
        },
      });
      const intentData = JSON.parse(intentRes.body).data;

      // 2. Officer B attempts to finalize Officer A's intent
      const finalizeRes = await app.inject({
        method: "POST",
        url: `/api/v1/uploads/${intentData.upload_id}/finalize`,
        headers: { authorization: `Bearer ${otherOfficerToken}` },
      });

      expect(finalizeRes.statusCode).toBe(403);
      const body = JSON.parse(finalizeRes.body);
      expect(body.error.code).toBe("FORBIDDEN");
    });

    it("completes full pipeline: intent -> direct PUT -> finalize -> verified upload token (15 min TTL)", async () => {
      // 1. Request intent
      const intentRes = await app.inject({
        method: "POST",
        url: "/api/v1/uploads/intents",
        headers: { authorization: `Bearer ${officerToken}` },
        payload: {
          purpose: "ITEM_PHOTO",
          content_type: "image/jpeg",
          size_bytes: 50000,
        },
      });
      expect(intentRes.statusCode).toBe(201);
      const intentData = JSON.parse(intentRes.body).data;

      // 2. Direct PUT simulation (B/E.1.2)
      const fakeImageBytes = Buffer.from("simulated-jpeg-binary-image-content");
      // Use storage service simulatePut for exact path
      const parsedUrl = new URL(intentData.put_url);
      const storageKey = parsedUrl.pathname.replace(/^\/[^/]+\//, ""); // remove /bucket/
      await uploadsService.simulatePut(storageKey, fakeImageBytes, "image/jpeg");

      // 3. Finalize upload (B/E.2.0)
      const finalizeRes = await app.inject({
        method: "POST",
        url: `/api/v1/uploads/${intentData.upload_id}/finalize`,
        headers: { authorization: `Bearer ${officerToken}` },
      });

      expect(finalizeRes.statusCode).toBe(200);
      const finalizeData = JSON.parse(finalizeRes.body).data;
      expect(finalizeData.upload_token).toBeDefined();
      expect(finalizeData.purpose).toBe("ITEM_PHOTO");

      // Verify TTL is roughly 15 minutes
      const expiresAt = new Date(finalizeData.expires_at).getTime();
      const diffMinutes = (expiresAt - Date.now()) / (1000 * 60);
      expect(diffMinutes).toBeGreaterThanOrEqual(14.8);
      expect(diffMinutes).toBeLessThanOrEqual(15.2);

      // 4. Token verification & consume (B/E.2.1)
      const consumed = uploadsService.verifyAndConsumeUploadToken(
        finalizeData.upload_token,
        "ITEM_PHOTO",
        officerUserId
      );
      expect(consumed.storagePath).toBe(storageKey);

      // 5. Anti-replay verification (cannot be consumed twice)
      expect(() =>
        uploadsService.verifyAndConsumeUploadToken(
          finalizeData.upload_token,
          "ITEM_PHOTO",
          officerUserId
        )
      ).toThrowError(/anti-replay/i);
    });

    it("rejects token when purpose doesn't match consumer (e.g. REPORT_PHOTO used in ITEM_PHOTO flow)", async () => {
      // 1. Student creates REPORT_PHOTO intent
      const intentRes = await app.inject({
        method: "POST",
        url: "/api/v1/uploads/intents",
        headers: { authorization: `Bearer ${studentToken}` },
        payload: {
          purpose: "REPORT_PHOTO",
          content_type: "image/png",
          size_bytes: 40000,
        },
      });
      const intentData = JSON.parse(intentRes.body).data;

      // 2. Simulate PUT
      const parsedUrl = new URL(intentData.put_url);
      const storageKey = parsedUrl.pathname.replace(/^\/[^/]+\//, "");
      await uploadsService.simulatePut(
        storageKey,
        Buffer.from("student-report-photo"),
        "image/png"
      );

      // 3. Finalize
      const finalizeRes = await app.inject({
        method: "POST",
        url: `/api/v1/uploads/${intentData.upload_id}/finalize`,
        headers: { authorization: `Bearer ${studentToken}` },
      });
      const finalizeData = JSON.parse(finalizeRes.body).data;

      // 4. Verification fails if officer tries to use it as ITEM_PHOTO
      expect(() =>
        uploadsService.verifyAndConsumeUploadToken(
          finalizeData.upload_token,
          "ITEM_PHOTO", // Expected ITEM_PHOTO but token has REPORT_PHOTO
          studentUserId
        )
      ).toThrowError(/Tujuan token tidak sesuai/i);
    });

    it("generates signed read URL without error (B/E.2.2)", async () => {
      const readUrl = await uploadsService.getSignedReadUrl("items/sample-item.jpg", 1800);
      expect(readUrl).toBeDefined();
      expect(typeof readUrl).toBe("string");
      expect(readUrl.length).toBeGreaterThan(10);
    });
  });
});
