import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import { authService } from "../src/modules/auth/auth.service.js";
import { uploadsService } from "../src/modules/uploads/uploads.service.js";
import { db, pool } from "../src/db/index.js";
import { users, foundItems, itemPhotos } from "../src/db/schema.js";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";

describe("Officer Item Registration & MVP Gate (Milestone B/F)", () => {
  let app: FastifyInstance;
  let officerToken: string;
  let officerUserId: string;
  let studentToken: string;
  let studentUserId: string;
  let unassignedOfficerToken: string;
  let otherOfficerToken: string;
  let otherOfficerUserId: string;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    // 1. Resolve seeded Officer (has Pos Pengajaran assigned)
    const officer = await db.query.users.findFirst({
      where: eq(users.email, "lostandfound.budiluhur@gmail.com"),
    });
    if (!officer) {
      throw new Error("Seeded officer not found. Run db:seed first.");
    }
    officerUserId = officer.userId;
    officerToken = authService.createToken({ sub: officer.authUserId });

    // 2. Resolve or create Student
    let student = await db.query.users.findFirst({
      where: eq(users.authUserId, "test-student-officer-f-01"),
    });
    if (!student) {
      const [inserted] = await db
        .insert(users)
        .values({
          authUserId: "test-student-officer-f-01",
          fullName: "Mahasiswa Tester F",
          email: "mhs.tester.f@budiluhur.ac.id",
          studentNumber: "2111500777",
          role: "STUDENT",
        })
        .returning();
      student = inserted;
    }
    studentUserId = student.userId;
    studentToken = authService.createToken({ sub: student.authUserId });

    // 3. Resolve or create Unassigned Officer (no service post assigned)
    let unassignedOfficer = await db.query.users.findFirst({
      where: eq(users.authUserId, "test-officer-unassigned-f-02"),
    });
    if (!unassignedOfficer) {
      const [inserted] = await db
        .insert(users)
        .values({
          authUserId: "test-officer-unassigned-f-02",
          fullName: "Petugas Tanpa Pos",
          email: "petugas.unassigned@budiluhur.ac.id",
          role: "OFFICER",
        })
        .returning();
      unassignedOfficer = inserted;
    }
    unassignedOfficerToken = authService.createToken({ sub: unassignedOfficer.authUserId });

    // 4. Resolve or create Secondary Officer for IDOR token tests
    let otherOfficer = await db.query.users.findFirst({
      where: eq(users.authUserId, "test-officer-secondary-f-03"),
    });
    if (!otherOfficer) {
      const [inserted] = await db
        .insert(users)
        .values({
          authUserId: "test-officer-secondary-f-03",
          fullName: "Petugas Sekunder",
          email: "petugas.sekunder.f@budiluhur.ac.id",
          role: "OFFICER",
        })
        .returning();
      otherOfficer = inserted;
    }
    otherOfficerUserId = otherOfficer.userId;
    otherOfficerToken = authService.createToken({ sub: otherOfficer.authUserId });
  });

  afterAll(async () => {
    const testItems = await db.query.foundItems.findMany({
      where: eq(foundItems.itemName, "Helm KYT TT Course Merah"),
    });
    for (const ti of testItems) {
      await db.delete(itemPhotos).where(eq(itemPhotos.itemId, ti.itemId));
      await db.delete(foundItems).where(eq(foundItems.itemId, ti.itemId));
    }
    await app.close();
    await pool.end();
  });

  // Helper to obtain a finalized upload token
  async function createValidUploadToken(
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
        size_bytes: 50000,
      },
    });
    const intentData = JSON.parse(intentRes.body).data;

    // Simulate R2 PUT
    const fakeImageBytes = Buffer.from("fake-binary-image-data-for-testing");
    const rawKey = intentData.put_url.split("lostandfound-budiluhur/")[1]?.split("?")[0];
    await uploadsService.simulatePut(rawKey, fakeImageBytes, "image/jpeg");

    // Finalize
    const finalizeRes = await app.inject({
      method: "POST",
      url: `/api/v1/uploads/${intentData.upload_id}/finalize`,
      headers: { authorization: `Bearer ${userToken}` },
    });
    return JSON.parse(finalizeRes.body).data.upload_token;
  }

  describe("Submilestone B/F.1 — POST /api/v1/officer/items", () => {
    it("returns 401 UNAUTHORIZED when no token is provided", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/officer/items",
        payload: {
          item_name: "Jaket Parka",
          category: "Pakaian",
          public_description: "Jaket hijau",
          item_photo_upload_tokens: ["fake-token"],
        },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe("UNAUTHORIZED");
    });

    it("returns 403 FORBIDDEN when user has role STUDENT", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/officer/items",
        headers: { authorization: `Bearer ${studentToken}` },
        payload: {
          item_name: "Jaket Parka",
          category: "Pakaian",
          public_description: "Jaket hijau",
          item_photo_upload_tokens: ["fake-token"],
        },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe("FORBIDDEN");
      expect(body.error.message).toContain("Hanya petugas");
    });

    it("returns 403 FORBIDDEN when OFFICER has no assigned service post in DB", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/officer/items",
        headers: { authorization: `Bearer ${unassignedOfficerToken}` },
        payload: {
          item_name: "Jaket Parka",
          category: "Pakaian",
          public_description: "Jaket hijau",
          item_photo_upload_tokens: ["fake-token"],
        },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe("FORBIDDEN");
      expect(body.error.message).toContain("pos penugasan aktif");
    });

    it("returns 422 VALIDATION_ERROR when required fields are missing", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/officer/items",
        headers: { authorization: `Bearer ${officerToken}` },
        payload: {
          item_name: "   ",
          category: "",
          item_photo_upload_tokens: [],
        },
      });

      expect(res.statusCode).toBe(422);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 422 when item_photo_upload_tokens has 0 or >1 token", async () => {
      const resZero = await app.inject({
        method: "POST",
        url: "/api/v1/officer/items",
        headers: { authorization: `Bearer ${officerToken}` },
        payload: {
          item_name: "Barang",
          category: "Aksesori",
          public_description: "Deskripsi",
          item_photo_upload_tokens: [],
        },
      });
      expect(resZero.statusCode).toBe(422);

      const resMultiple = await app.inject({
        method: "POST",
        url: "/api/v1/officer/items",
        headers: { authorization: `Bearer ${officerToken}` },
        payload: {
          item_name: "Barang",
          category: "Aksesori",
          public_description: "Deskripsi",
          item_photo_upload_tokens: ["t1", "t2"],
        },
      });
      expect(resMultiple.statusCode).toBe(422);
    });

    it("returns 422 INVALID_TOKEN when photo upload token is invalid or tampered", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/officer/items",
        headers: { authorization: `Bearer ${officerToken}` },
        payload: {
          item_name: "Laptop HP",
          category: "Elektronik",
          public_description: "Laptop HP hitam",
          item_photo_upload_tokens: ["invalid.tampered.token"],
        },
      });

      expect(res.statusCode).toBe(422);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe("INVALID_TOKEN");
    });

    it("returns 422 INVALID_PURPOSE when upload token purpose is REPORT_PHOTO", async () => {
      const reportToken = await createValidUploadToken(studentToken, "REPORT_PHOTO");

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/officer/items",
        headers: { authorization: `Bearer ${officerToken}` },
        payload: {
          item_name: "Laptop HP",
          category: "Elektronik",
          public_description: "Laptop HP hitam",
          item_photo_upload_tokens: [reportToken],
        },
      });

      expect(res.statusCode).toBe(422);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe("INVALID_PURPOSE");
    });

    it("returns 403 FORBIDDEN when Officer A attempts to use Officer B's upload token (IDOR)", async () => {
      // Create token for Officer B
      const tokenOfficerB = await createValidUploadToken(otherOfficerToken, "ITEM_PHOTO");

      // Attempt to consume as Officer A
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/officer/items",
        headers: { authorization: `Bearer ${officerToken}` },
        payload: {
          item_name: "Dompet Kulit Cokelat",
          category: "Aksesori",
          public_description: "Dompet cokelat merk Eiger",
          item_photo_upload_tokens: [tokenOfficerB],
        },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe("FORBIDDEN");
      expect(body.error.message).toContain("bukan milik akun");
    });

    it("returns 201 CREATED for valid item registration (End-to-End Success)", async () => {
      const validItemToken = await createValidUploadToken(officerToken, "ITEM_PHOTO");

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/officer/items",
        headers: { authorization: `Bearer ${officerToken}` },
        payload: {
          item_name: "Helm KYT TT Course Merah",
          category: "Aksesori",
          public_description: "Helm full face warna merah motif grafis",
          private_verification_notes: "Ada goresan kecil di visor dan stiker nomor 93",
          found_location: "Parkiran Motor Gedung Pengajaran Lt. 1",
          found_on: "2026-10-25",
          item_photo_upload_tokens: [validItemToken],
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data).toBeDefined();

      const item = body.data;
      expect(item.item_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
      expect(item.inventory_code).toMatch(/^INV-2026-\d{4}$/);
      expect(item.item_name).toBe("Helm KYT TT Course Merah");
      expect(item.category).toBe("Aksesori");
      expect(item.status).toBe("STORED");
      expect(item.is_visible).toBe(true);
      expect(item.storage_post_id).toBe(1);
      expect(item.post.name).toBe("Pos Pengajaran");
      expect(item.private_verification_notes).toBe(
        "Ada goresan kecil di visor dan stiker nomor 93"
      );
      expect(item.photos.length).toBe(1);
      expect(item.photos[0].is_primary).toBe(true);
      expect(item.photos[0].url).toBeDefined();

      // Submilestone B/F.2.0: Verify item is immediately visible in public catalog
      const publicCatalogRes = await app.inject({
        method: "GET",
        url: `/api/v1/items/${item.item_id}`,
      });

      expect(publicCatalogRes.statusCode).toBe(200);
      const publicData = JSON.parse(publicCatalogRes.body).data;
      expect(publicData.item_name).toBe("Helm KYT TT Course Merah");

      // Verify privacy bounds: private_verification_notes must NOT be exposed publicly
      expect((publicData as any).private_verification_notes).toBeUndefined();

      // Submilestone B/F.2.2: Replay attack prevention
      const replayRes = await app.inject({
        method: "POST",
        url: "/api/v1/officer/items",
        headers: { authorization: `Bearer ${officerToken}` },
        payload: {
          item_name: "Helm KYT Duplikat",
          category: "Aksesori",
          public_description: "Deskripsi",
          item_photo_upload_tokens: [validItemToken], // Reusing consumed token!
        },
      });

      expect(replayRes.statusCode).toBe(409);
      const replayBody = JSON.parse(replayRes.body);
      expect(replayBody.error.code).toBe("TOKEN_ALREADY_USED");
    });
  });
});
