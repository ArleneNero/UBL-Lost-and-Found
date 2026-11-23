import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import { authService } from "../src/modules/auth/auth.service.js";
import { uploadsService } from "../src/modules/uploads/uploads.service.js";
import { db, pool } from "../src/db/index.js";
import {
  users,
  foundSubmissions,
  submissionStatusHistory,
  foundItems,
  itemPhotos,
  itemReturns,
} from "../src/db/schema.js";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";

describe("Milestone B/I, B/G & B/J — Officer Submissions, Inventory & Disposition", () => {
  let app: FastifyInstance;
  let officerToken: string;
  let officerUserId: string;
  let studentToken: string;
  let studentUserId: string;

  let submissionToReceiveId: string;
  let submissionWithoutTokenId: string;
  let submissionToRejectId: string;
  let receivedItemId: string;
  let receivedWithoutTokenItemId: string;
  let directItemId: string;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    // 1. Resolve officer
    const officer = await db.query.users.findFirst({
      where: eq(users.email, "lostandfound.budiluhur@gmail.com"),
    });
    if (!officer) throw new Error("Seeded officer not found");
    officerUserId = officer.userId;
    officerToken = authService.createToken({ sub: officer.authUserId });

    // 2. Setup Student
    let student = await db.query.users.findFirst({
      where: eq(users.authUserId, "test-student-officer-flows-01"),
    });
    if (!student) {
      const [inserted] = await db
        .insert(users)
        .values({
          authUserId: "test-student-officer-flows-01",
          fullName: "Mahasiswa Flow Tester",
          email: "flow.tester@student.budiluhur.ac.id",
          studentNumber: "2111500333",
          role: "STUDENT",
        })
        .returning();
      student = inserted;
    }
    studentUserId = student.userId;
    studentToken = authService.createToken({ sub: student.authUserId, email: student.email });
  });

  afterAll(async () => {
    // Cleanup items & submissions
    if (receivedItemId) {
      await db.delete(itemReturns).where(eq(itemReturns.itemId, receivedItemId));
      await db.delete(itemPhotos).where(eq(itemPhotos.itemId, receivedItemId));
      await db.delete(foundItems).where(eq(foundItems.itemId, receivedItemId));
    }
    if (receivedWithoutTokenItemId) {
      await db.delete(itemReturns).where(eq(itemReturns.itemId, receivedWithoutTokenItemId));
      await db.delete(itemPhotos).where(eq(itemPhotos.itemId, receivedWithoutTokenItemId));
      await db.delete(foundItems).where(eq(foundItems.itemId, receivedWithoutTokenItemId));
    }
    if (directItemId) {
      await db.delete(itemReturns).where(eq(itemReturns.itemId, directItemId));
      await db.delete(itemPhotos).where(eq(itemPhotos.itemId, directItemId));
      await db.delete(foundItems).where(eq(foundItems.itemId, directItemId));
    }
    if (submissionToReceiveId) {
      await db.delete(submissionStatusHistory).where(eq(submissionStatusHistory.submissionId, submissionToReceiveId));
      await db.delete(foundSubmissions).where(eq(foundSubmissions.submissionId, submissionToReceiveId));
    }
    if (submissionWithoutTokenId) {
      await db.delete(submissionStatusHistory).where(eq(submissionStatusHistory.submissionId, submissionWithoutTokenId));
      await db.delete(foundSubmissions).where(eq(foundSubmissions.submissionId, submissionWithoutTokenId));
    }
    if (submissionToRejectId) {
      await db.delete(submissionStatusHistory).where(eq(submissionStatusHistory.submissionId, submissionToRejectId));
      await db.delete(foundSubmissions).where(eq(foundSubmissions.submissionId, submissionToRejectId));
    }
    if (studentUserId) {
      await db.delete(users).where(eq(users.userId, studentUserId));
    }
    await app.close();
    await pool.end();
  });

  async function createUploadToken(
    userToken: string,
    purpose: "ITEM_PHOTO" | "REPORT_PHOTO"
  ): Promise<string> {
    const intentRes = await app.inject({
      method: "POST",
      url: "/api/v1/uploads/intents",
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        purpose,
        content_type: "image/jpeg",
        size_bytes: 40000,
      },
    });
    const intentData = JSON.parse(intentRes.body).data;
    const fakeBytes = Buffer.from("fake-binary-photo-data");
    const rawKey = intentData.put_url.split("lostandfound-budiluhur/")[1]?.split("?")[0];
    await uploadsService.simulatePut(rawKey, fakeBytes, "image/jpeg");

    const finalizeRes = await app.inject({
      method: "POST",
      url: `/api/v1/uploads/${intentData.upload_id}/finalize`,
      headers: { authorization: `Bearer ${userToken}` },
    });
    return JSON.parse(finalizeRes.body).data.upload_token;
  }

  describe("B/I.1: Officer Submissions Review & Physical Receipt", () => {
    it("creates two student submissions for officer processing", async () => {
      const token1 = await createUploadToken(studentToken, "REPORT_PHOTO");
      const res1 = await app.inject({
        method: "POST",
        url: "/api/v1/submissions",
        headers: { authorization: `Bearer ${studentToken}` },
        payload: {
          target_post_id: 1,
          item_name: "Tumbler Hydro Flask Biru",
          category: "Botol Minum",
          public_description: "Tumbler 500ml biru muda tertinggal di Lab",
          found_location: "Lab Komputer 3",
          found_on: "2026-11-09",
          report_photo_upload_token: token1,
        },
      });
      expect(res1.statusCode).toBe(201);
      submissionToReceiveId = JSON.parse(res1.body).data.submission_id;

      const token2 = await createUploadToken(studentToken, "REPORT_PHOTO");
      const res2 = await app.inject({
        method: "POST",
        url: "/api/v1/submissions",
        headers: { authorization: `Bearer ${studentToken}` },
        payload: {
          target_post_id: 1,
          item_name: "Jaket Hitam Parasut",
          category: "Pakaian",
          public_description: "Jaket hitam ukuran L di Gazebo",
          found_location: "Gazebo Tengah",
          found_on: "2026-11-09",
          report_photo_upload_token: token2,
        },
      });
      expect(res2.statusCode).toBe(201);
      submissionToRejectId = JSON.parse(res2.body).data.submission_id;
    });

    it("GET /officer/submissions: returns list of submissions for officer post", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/officer/submissions?status=PENDING_RECEIPT",
        headers: { authorization: `Bearer ${officerToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toBeInstanceOf(Array);
      expect(body.data.length).toBeGreaterThanOrEqual(2);
      expect(body.meta.total).toBeGreaterThanOrEqual(2);
    });

    it("POST /officer/submissions/:id/receive: officer verifies and receives physical item", async () => {
      const officerItemPhotoToken = await createUploadToken(officerToken, "ITEM_PHOTO");

      const res = await app.inject({
        method: "POST",
        url: `/api/v1/officer/submissions/${submissionToReceiveId}/receive`,
        headers: { authorization: `Bearer ${officerToken}` },
        payload: {
          public_description: "Tumbler Hydro Flask 500ml warna biru muda kondisi mulus",
          private_verification_notes: "Ada stiker logo kecil di bagian bawah tumbler",
          item_photo_upload_tokens: [officerItemPhotoToken],
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.item_id).toBeDefined();
      expect(body.data.inventory_code).toMatch(/^INV-\d{4}-\d{4}$/);
      expect(body.data.status).toBe("STORED");
      expect(body.data.is_visible).toBe(true);
      expect(body.data.source_submission_id).toBe(submissionToReceiveId);
      receivedItemId = body.data.item_id;

      // Verify submission status changed to RECEIVED
      const subRes = await app.inject({
        method: "GET",
        url: `/api/v1/submissions/${submissionToReceiveId}`,
        headers: { authorization: `Bearer ${officerToken}` },
      });
      const subBody = JSON.parse(subRes.body);
      expect(subBody.data.status).toBe("RECEIVED");
      expect(subBody.data.history.length).toBe(2);
      expect(subBody.data.history[1].to_status).toBe("RECEIVED");
    });

    it("POST /officer/submissions/:id/receive: succeeds WITHOUT item_photo_upload_tokens and reuses submission.reportPhotoPath", async () => {
      const reportPhotoToken = await createUploadToken(studentToken, "REPORT_PHOTO");
      const createRes = await app.inject({
        method: "POST",
        url: "/api/v1/submissions",
        headers: { authorization: `Bearer ${studentToken}` },
        payload: {
          target_post_id: 1,
          item_name: "Payung Lipat Hitam",
          category: "Aksesori",
          public_description: "Payung lipat hitam tertinggal di selasar gedung",
          found_location: "Selasar Gedung Unit 3",
          found_on: "2026-11-10",
          report_photo_upload_token: reportPhotoToken,
        },
      });
      expect(createRes.statusCode).toBe(201);
      submissionWithoutTokenId = JSON.parse(createRes.body).data.submission_id;

      const receiveRes = await app.inject({
        method: "POST",
        url: `/api/v1/officer/submissions/${submissionWithoutTokenId}/receive`,
        headers: { authorization: `Bearer ${officerToken}` },
        payload: {
          public_description: "Payung lipat hitam kondisi baik",
          private_verification_notes: "Ada label nama pudar di gagang",
        },
      });

      expect(receiveRes.statusCode).toBe(201);
      const body = JSON.parse(receiveRes.body);
      expect(body.data.item_id).toBeDefined();
      expect(body.data.status).toBe("STORED");
      expect(body.data.is_visible).toBe(true);
      expect(body.data.source_submission_id).toBe(submissionWithoutTokenId);
      expect(body.data.photos).toHaveLength(1);
      receivedWithoutTokenItemId = body.data.item_id;

      const submissionRow = await db.query.foundSubmissions.findFirst({
        where: eq(foundSubmissions.submissionId, submissionWithoutTokenId),
      });
      const itemPhotoRow = await db.query.itemPhotos.findFirst({
        where: eq(itemPhotos.itemId, receivedWithoutTokenItemId),
      });
      expect(submissionRow?.reportPhotoPath).toBeTruthy();
      expect(itemPhotoRow?.storagePath).toBe(submissionRow?.reportPhotoPath);
    });

    it("POST /officer/submissions/:id/reject: officer rejects report with reason", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/officer/submissions/${submissionToRejectId}/reject`,
        headers: { authorization: `Bearer ${officerToken}` },
        payload: {
          reason: "Fisik barang tidak diserahkan ke pos setelah batas waktu konfirmasi",
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.status).toBe("REJECTED");
    });
  });

  describe("B/G: Officer Inventory & Visibility Management", () => {
    it("GET /officer/inventory: returns post inventory including newly received item", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/officer/inventory",
        headers: { authorization: `Bearer ${officerToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toBeInstanceOf(Array);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      const item = body.data.find((i: any) => i.item_id === receivedItemId);
      expect(item).toBeDefined();
      expect(item.private_verification_notes).toBe("Ada stiker logo kecil di bagian bawah tumbler");
    });

    it("GET /officer/items/:id: returns item detail for post officer", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/officer/items/${receivedItemId}`,
        headers: { authorization: `Bearer ${officerToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.item_id).toBe(receivedItemId);
    });

    it("PATCH /officer/items/:id/visibility: toggles visibility of STORED item", async () => {
      const hideRes = await app.inject({
        method: "PATCH",
        url: `/api/v1/officer/items/${receivedItemId}/visibility`,
        headers: { authorization: `Bearer ${officerToken}` },
        payload: { is_visible: false },
      });
      expect(hideRes.statusCode).toBe(200);
      expect(JSON.parse(hideRes.body).data.is_visible).toBe(false);

      const showRes = await app.inject({
        method: "PATCH",
        url: `/api/v1/officer/items/${receivedItemId}/visibility`,
        headers: { authorization: `Bearer ${officerToken}` },
        payload: { is_visible: true },
      });
      expect(showRes.statusCode).toBe(200);
      expect(JSON.parse(showRes.body).data.is_visible).toBe(true);
    });

    it("GET /officer/inventory/overdue: returns overdue list without mutation", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/officer/inventory/overdue",
        headers: { authorization: `Bearer ${officerToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toBeInstanceOf(Array);
    });
  });

  describe("B/J: Physical Return & Distribution", () => {
    it("POST /officer/items/:id/return: returns item to verified owner", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/officer/items/${receivedItemId}/return`,
        headers: { authorization: `Bearer ${officerToken}` },
        payload: {
          recipient_name: "Dimas Pemilik",
          verification_summary: "Pemilik menunjukkan foto tumbler dan stiker yang cocok secara fisik di pos",
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.return_id).toBeDefined();
      expect(body.data.item_id).toBe(receivedItemId);
      expect(body.data.recipient_name).toBe("Dimas Pemilik");

      // Verify item status in DB changed to RETURNED_TO_OWNER and is_visible is false
      const itemInDb = await db.query.foundItems.findFirst({
        where: eq(foundItems.itemId, receivedItemId),
      });
      expect(itemInDb?.status).toBe("RETURNED_TO_OWNER");
      expect(itemInDb?.isVisible).toBe(false);
    });

    it("POST /officer/items/:id/return: returns 409 CONFLICT if already returned", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/officer/items/${receivedItemId}/return`,
        headers: { authorization: `Bearer ${officerToken}` },
        payload: {
          recipient_name: "Orang Lain",
          verification_summary: "Coba serahkan lagi",
        },
      });

      expect(res.statusCode).toBe(409);
      expect(JSON.parse(res.body).error.code).toBe("INVALID_STATUS_TRANSITION");
    });

    it("POST /officer/items/:id/distribute: distributes an item under post policy", async () => {
      // Create a direct item first
      const photoToken = await createUploadToken(officerToken, "ITEM_PHOTO");
      const directRes = await app.inject({
        method: "POST",
        url: "/api/v1/officer/items",
        headers: { authorization: `Bearer ${officerToken}` },
        payload: {
          item_name: "Buku Catatan Matematika",
          category: "Buku",
          public_description: "Buku catatan spiral sampul coklat",
          item_photo_upload_tokens: [photoToken],
        },
      });
      expect(directRes.statusCode).toBe(201);
      directItemId = JSON.parse(directRes.body).data.item_id;

      // Distribute the item
      const distRes = await app.inject({
        method: "POST",
        url: `/api/v1/officer/items/${directItemId}/distribute`,
        headers: { authorization: `Bearer ${officerToken}` },
      });

      expect(distRes.statusCode).toBe(200);
      const distBody = JSON.parse(distRes.body);
      expect(distBody.data.status).toBe("DISTRIBUTED");
      expect(distBody.data.is_visible).toBe(false);

      // Verify item in DB
      const itemInDb = await db.query.foundItems.findFirst({
        where: eq(foundItems.itemId, directItemId),
      });
      expect(itemInDb?.status).toBe("DISTRIBUTED");
      expect(itemInDb?.isVisible).toBe(false);
    });
  });

  describe("Post Overdue Policy (365d Default & Non-Retroactive Snapshot)", () => {
    let oldSnapshotItemId: string;
    let newSnapshotItemId: string;

    afterAll(async () => {
      if (oldSnapshotItemId) {
        await db.delete(itemPhotos).where(eq(itemPhotos.itemId, oldSnapshotItemId));
        await db.delete(foundItems).where(eq(foundItems.itemId, oldSnapshotItemId));
      }
      if (newSnapshotItemId) {
        await db.delete(itemPhotos).where(eq(itemPhotos.itemId, newSnapshotItemId));
        await db.delete(foundItems).where(eq(foundItems.itemId, newSnapshotItemId));
      }
      await app.inject({
        method: "PATCH",
        url: "/api/v1/officer/post-settings",
        headers: { authorization: `Bearer ${officerToken}` },
        payload: { storage_limit_days: 365 },
      });
    });

    it("rejects invalid storage_limit_days (0 or >730) with 422", async () => {
      const invalidRes = await app.inject({
        method: "PATCH",
        url: "/api/v1/officer/post-settings",
        headers: { authorization: `Bearer ${officerToken}` },
        payload: { storage_limit_days: 0 },
      });
      expect(invalidRes.statusCode).toBe(422);

      const overMaxRes = await app.inject({
        method: "PATCH",
        url: "/api/v1/officer/post-settings",
        headers: { authorization: `Bearer ${officerToken}` },
        payload: { storage_limit_days: 731 },
      });
      expect(overMaxRes.statusCode).toBe(422);
    });

    it("snapshots storage_limit_days per item so updating post policy is non-retroactive", async () => {
      // Ensure post starts at 365 days
      const initGet = await app.inject({
        method: "GET",
        url: "/api/v1/officer/post-settings",
        headers: { authorization: `Bearer ${officerToken}` },
      });
      expect(initGet.statusCode).toBe(200);
      expect(JSON.parse(initGet.body).data.storage_limit_days).toBe(365);

      // Create item A under 365-day policy
      const tokenA = await createUploadToken(officerToken, "ITEM_PHOTO");
      const resA = await app.inject({
        method: "POST",
        url: "/api/v1/officer/items",
        headers: { authorization: `Bearer ${officerToken}` },
        payload: {
          item_name: "Kacamata Snapshot Lama",
          category: "Aksesori",
          public_description: "Kacamata hitam frame tebal",
          item_photo_upload_tokens: [tokenA],
        },
      });
      expect(resA.statusCode).toBe(201);
      const bodyA = JSON.parse(resA.body).data;
      oldSnapshotItemId = bodyA.item_id;
      expect(bodyA.storage_limit_days).toBe(365);

      // Change post policy to 90 days
      const patchRes = await app.inject({
        method: "PATCH",
        url: "/api/v1/officer/post-settings",
        headers: { authorization: `Bearer ${officerToken}` },
        payload: { storage_limit_days: 90 },
      });
      expect(patchRes.statusCode).toBe(200);
      expect(JSON.parse(patchRes.body).data.storage_limit_days).toBe(90);

      // Create item B under 90-day policy
      const tokenB = await createUploadToken(officerToken, "ITEM_PHOTO");
      const resB = await app.inject({
        method: "POST",
        url: "/api/v1/officer/items",
        headers: { authorization: `Bearer ${officerToken}` },
        payload: {
          item_name: "Kacamata Snapshot Baru",
          category: "Aksesori",
          public_description: "Kacamata baca bening",
          item_photo_upload_tokens: [tokenB],
        },
      });
      expect(resB.statusCode).toBe(201);
      const bodyB = JSON.parse(resB.body).data;
      newSnapshotItemId = bodyB.item_id;
      expect(bodyB.storage_limit_days).toBe(90);

      // Verify item A remains locked at 365 in DB (non-retroactive)
      const itemAInDb = await db.query.foundItems.findFirst({
        where: eq(foundItems.itemId, oldSnapshotItemId),
      });
      expect(itemAInDb?.storageLimitDays).toBe(365);
    });
  });

  describe("Soft-Archive Clean Completed Inventory", () => {
    it("archives only RETURNED_TO_OWNER & DISTRIBUTED items while preserving STORED and include_archived=true query", async () => {
      const cleanRes = await app.inject({
        method: "POST",
        url: "/api/v1/officer/inventory/clean",
        headers: { authorization: `Bearer ${officerToken}` },
        payload: {},
      });
      expect(cleanRes.statusCode).toBe(200);
      const { archived_count } = JSON.parse(cleanRes.body).data;
      expect(archived_count).toBeGreaterThanOrEqual(2);

      // Default listing hides archived items and supports limit=100
      const listActive = await app.inject({
        method: "GET",
        url: "/api/v1/officer/inventory?limit=100",
        headers: { authorization: `Bearer ${officerToken}` },
      });
      expect(listActive.statusCode).toBe(200);
      const activeIds = JSON.parse(listActive.body).data.map((i: { item_id: string }) => i.item_id);
      expect(activeIds).not.toContain(receivedItemId);
      expect(activeIds).not.toContain(directItemId);

      // include_archived=true returns archived items
      const listAll = await app.inject({
        method: "GET",
        url: "/api/v1/officer/inventory?limit=100&include_archived=true",
        headers: { authorization: `Bearer ${officerToken}` },
      });
      expect(listAll.statusCode).toBe(200);
      const allIds = JSON.parse(listAll.body).data.map((i: { item_id: string }) => i.item_id);
      expect(allIds).toContain(receivedItemId);
      expect(allIds).toContain(directItemId);
    });

    it("rejects invalid month format on /officer/inventory/clean with 422", async () => {
      const badRes = await app.inject({
        method: "POST",
        url: "/api/v1/officer/inventory/clean",
        headers: { authorization: `Bearer ${officerToken}` },
        payload: { month: "2026/11" },
      });
      expect(badRes.statusCode).toBe(422);
    });
  });
});
