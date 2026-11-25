import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import { authService } from "../src/modules/auth/auth.service.js";
import { uploadsService } from "../src/modules/uploads/uploads.service.js";
import { db, pool } from "../src/db/index.js";
import { users, foundSubmissions, submissionStatusHistory } from "../src/db/schema.js";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";

describe("Milestone B/H — Student Bootstrap & Found Submissions", () => {
  let app: FastifyInstance;
  let student1Token: string;
  let student1UserId: string;
  let student2Token: string;
  let student2UserId: string;
  let officerToken: string;
  let officerUserId: string;
  let createdSubmissionId: string;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    // 1. Resolve seeded officer
    const officer = await db.query.users.findFirst({
      where: eq(users.email, "lostandfound.budiluhur@gmail.com"),
    });
    if (!officer) throw new Error("Seeded officer not found");
    officerUserId = officer.userId;
    officerToken = authService.createToken({ sub: officer.authUserId });

    // 2. Setup Student 1
    let s1 = await db.query.users.findFirst({
      where: eq(users.authUserId, "test-student-bh-01"),
    });
    if (!s1) {
      const [inserted] = await db
        .insert(users)
        .values({
          authUserId: "test-student-bh-01",
          fullName: "Ahmad Mahasiswa 1",
          email: "2111500111@student.budiluhur.ac.id",
          studentNumber: "2111500111",
          role: "STUDENT",
        })
        .returning();
      s1 = inserted;
    }
    student1UserId = s1.userId;
    student1Token = authService.createToken({ sub: s1.authUserId, email: s1.email });

    // 3. Setup Student 2
    let s2 = await db.query.users.findFirst({
      where: eq(users.authUserId, "test-student-bh-02"),
    });
    if (!s2) {
      const [inserted] = await db
        .insert(users)
        .values({
          authUserId: "test-student-bh-02",
          fullName: "Budi Mahasiswa 2",
          email: "2111500222@student.budiluhur.ac.id",
          studentNumber: "2111500222",
          role: "STUDENT",
        })
        .returning();
      s2 = inserted;
    }
    student2UserId = s2.userId;
    student2Token = authService.createToken({ sub: s2.authUserId, email: s2.email });
  });

  afterAll(async () => {
    if (createdSubmissionId) {
      await db.delete(submissionStatusHistory).where(eq(submissionStatusHistory.submissionId, createdSubmissionId));
      await db.delete(foundSubmissions).where(eq(foundSubmissions.submissionId, createdSubmissionId));
    }
    await db.delete(users).where(eq(users.authUserId, "test-bootstrap-new-user-01"));
    if (student1UserId) await db.delete(users).where(eq(users.userId, student1UserId));
    if (student2UserId) await db.delete(users).where(eq(users.userId, student2UserId));
    await app.close();
    await pool.end();
  });

  async function createValidPhotoToken(userToken: string): Promise<string> {
    const intentRes = await app.inject({
      method: "POST",
      url: "/api/v1/uploads/intents",
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        purpose: "REPORT_PHOTO",
        content_type: "image/jpeg",
        size_bytes: 45000,
      },
    });
    const intentData = JSON.parse(intentRes.body).data;
    const fakeBytes = Buffer.from("fake-binary-report-photo");
    const rawKey = intentData.put_url.split("lostandfound-budiluhur/")[1]?.split("?")[0];
    await uploadsService.simulatePut(rawKey, fakeBytes, "image/jpeg");

    const finalizeRes = await app.inject({
      method: "POST",
      url: `/api/v1/uploads/${intentData.upload_id}/finalize`,
      headers: { authorization: `Bearer ${userToken}` },
    });
    return JSON.parse(finalizeRes.body).data.upload_token;
  }

  describe("B/H.1.0: POST /me/bootstrap", () => {
    it("returns 401 when token is missing", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/me/bootstrap",
        payload: { full_name: "Tes" },
      });
      expect(res.statusCode).toBe(401);
    });

    it("returns 401 when token lacks email claim", async () => {
      const noEmailToken = authService.createToken({
        sub: "2211500999",
      });

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/me/bootstrap",
        headers: { authorization: `Bearer ${noEmailToken}` },
        payload: {
          full_name: "Tanpa Email",
        },
      });
      expect(res.statusCode).toBe(401);
      expect(JSON.parse(res.body).error.code).toBe("UNAUTHORIZED");
    });

    it("returns 400 VALIDATION_ERROR when student_number is injected into bootstrap payload", async () => {
      const newToken = authService.createToken({
        sub: "test-bootstrap-new-user-01",
        email: "2211500999@student.budiluhur.ac.id",
      });

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/me/bootstrap",
        headers: { authorization: `Bearer ${newToken}` },
        payload: {
          full_name: "Mahasiswa Inject",
          student_number: "9999999999",
        },
      });

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 201 when new student bootstraps profile and strictly extracts 10-digit NIM from email", async () => {
      const newToken = authService.createToken({
        sub: "test-bootstrap-new-user-01",
        email: "2211500999@student.budiluhur.ac.id",
      });

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/me/bootstrap",
        headers: { authorization: `Bearer ${newToken}` },
        payload: {
          full_name: "Mahasiswa Baru",
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.full_name).toBe("Mahasiswa Baru");
      expect(body.data.student_number).toBe("2211500999");
      expect(body.data.role).toBe("STUDENT");
    });

    it("returns 400 INVALID_STUDENT_NIM when bootstrap email local-part is not strict 10 digits", async () => {
      const invalidNimToken = authService.createToken({
        sub: "test-bootstrap-invalid-nim-01",
        email: "baru.mhs@student.budiluhur.ac.id",
      });

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/me/bootstrap",
        headers: { authorization: `Bearer ${invalidNimToken}` },
        payload: {
          full_name: "Mahasiswa Non NIM",
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe("INVALID_STUDENT_NIM");
    });

    it("returns 409 PROFILE_EXISTS when student already exists", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/me/bootstrap",
        headers: { authorization: `Bearer ${student1Token}` },
        payload: {
          full_name: "Ahmad Mahasiswa 1",
        },
      });

      expect(res.statusCode).toBe(409);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe("PROFILE_EXISTS");
    });

    it("returns 403 INVALID_STUDENT_DOMAIN when email domain is not @student.budiluhur.ac.id", async () => {
      const nonStudentToken = authService.createToken({
        sub: "test-bootstrap-gmail-user",
        email: "random.user@gmail.com",
      });

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/me/bootstrap",
        headers: { authorization: `Bearer ${nonStudentToken}` },
        payload: {
          full_name: "User Gmail",
        },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe("INVALID_STUDENT_DOMAIN");
    });
  });

  describe("B/H.1.1: POST /submissions", () => {
    it("returns 403 FORBIDDEN when called by an OFFICER", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/submissions",
        headers: { authorization: `Bearer ${officerToken}` },
        payload: {
          target_post_id: 1,
          item_name: "Kunci Motor Honda",
          category: "Kunci",
          public_description: "Kunci motor ada gantungan biru",
          found_location: "Parkiran Motor Depan",
          found_on: "2026-11-09",
          report_photo_upload_token: "dummy-token",
        },
      });

      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res.body).error.code).toBe("FORBIDDEN");
    });

    it("returns 201 CREATED when student creates a valid report", async () => {
      const uploadToken = await createValidPhotoToken(student1Token);

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/submissions",
        headers: { authorization: `Bearer ${student1Token}` },
        payload: {
          target_post_id: 1,
          item_name: "Kunci Motor Honda Vario",
          category: "Kunci",
          public_description: "Kunci motor dengan gantungan karet biru",
          found_location: "Parkiran Motor Depan Gedung 4",
          found_on: "2026-11-09",
          report_photo_upload_token: uploadToken,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.submission_id).toBeDefined();
      expect(body.data.report_code).toMatch(/^REP-\d{4}-\d{4}$/);
      expect(body.data.status).toBe("PENDING_RECEIPT");
      expect(body.data.report_photo_url).toBeDefined();
      createdSubmissionId = body.data.submission_id;

      // Verify initial history in DB
      const history = await db.query.submissionStatusHistory.findMany({
        where: eq(submissionStatusHistory.submissionId, createdSubmissionId),
      });
      expect(history.length).toBe(1);
      expect(history[0].toStatus).toBe("PENDING_RECEIPT");
      expect(history[0].fromStatus).toBeNull();
    });
  });

  describe("B/H.1.2: GET /submissions/me", () => {
    it("returns only reports submitted by the requesting student", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/submissions/me",
        headers: { authorization: `Bearer ${student1Token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toBeInstanceOf(Array);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      expect(body.meta.total).toBeGreaterThanOrEqual(1);
      expect(body.data[0].submission_id).toBe(createdSubmissionId);
    });

    it("returns empty list for student who has not submitted any reports", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/submissions/me",
        headers: { authorization: `Bearer ${student2Token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.length).toBe(0);
      expect(body.meta.total).toBe(0);
    });
  });

  describe("B/H.2.0: GET /submissions/:submission_id", () => {
    it("returns report details and history to the owner student", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/submissions/${createdSubmissionId}`,
        headers: { authorization: `Bearer ${student1Token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.submission_id).toBe(createdSubmissionId);
      expect(body.data.history).toBeInstanceOf(Array);
      expect(body.data.history.length).toBe(1);
      expect(body.data.history[0].to_status).toBe("PENDING_RECEIPT");
    });

    it("returns report details and history to the assigned officer of target post", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/submissions/${createdSubmissionId}`,
        headers: { authorization: `Bearer ${officerToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.submission_id).toBe(createdSubmissionId);
    });

    it("returns 403 FORBIDDEN when accessed by another student", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/submissions/${createdSubmissionId}`,
        headers: { authorization: `Bearer ${student2Token}` },
      });

      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res.body).error.code).toBe("FORBIDDEN");
    });
  });

  describe("B/H.2.1: POST /submissions/:submission_id/cancel", () => {
    it("returns 403 when another student attempts to cancel the report", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/submissions/${createdSubmissionId}/cancel`,
        headers: { authorization: `Bearer ${student2Token}` },
        payload: { reason: "Mencoba membatalkan laporan orang lain" },
      });

      expect(res.statusCode).toBe(403);
    });

    it("returns 200 and sets status to CANCELLED when cancelled by owner", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/submissions/${createdSubmissionId}/cancel`,
        headers: { authorization: `Bearer ${student1Token}` },
        payload: { reason: "Barang sudah diambil langsung oleh pemilik sebelum diserahkan" },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.status).toBe("CANCELLED");

      // Verify history updated
      const historyRes = await app.inject({
        method: "GET",
        url: `/api/v1/submissions/${createdSubmissionId}`,
        headers: { authorization: `Bearer ${student1Token}` },
      });
      const historyBody = JSON.parse(historyRes.body);
      expect(historyBody.data.history.length).toBe(2);
      expect(historyBody.data.history[1].to_status).toBe("CANCELLED");
    });

    it("returns 409 INVALID_STATUS_TRANSITION when attempting to cancel an already cancelled report", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/submissions/${createdSubmissionId}/cancel`,
        headers: { authorization: `Bearer ${student1Token}` },
        payload: { reason: "Batal lagi" },
      });

      expect(res.statusCode).toBe(409);
      expect(JSON.parse(res.body).error.code).toBe("INVALID_STATUS_TRANSITION");
    });
  });
});
