import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import { FastifyInstance } from "fastify";
import { pool } from "../src/db/index.js";

describe("B/C.1 — Service Posts Public APIs (GET /api/v1/posts, GET /api/v1/posts/:post_id)", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  describe("B/C.1.1: GET /api/v1/posts", () => {
    it("should respond 200 OK with list of service posts and pagination metadata", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/posts",
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.body);

      // Verify envelope structure
      expect(json).toHaveProperty("data");
      expect(json).toHaveProperty("meta");
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThanOrEqual(1);

      // Verify pagination meta
      expect(json.meta).toMatchObject({
        page: 1,
        limit: 10,
      });
      expect(typeof json.meta.total).toBe("number");
      expect(typeof json.meta.total_pages).toBe("number");

      // Verify Pos Pengajaran content
      const posPengajaran = json.data.find((p: any) => p.name === "Pos Pengajaran");
      expect(posPengajaran).toBeDefined();
      expect(posPengajaran.post_id).toBe(1);
      expect(posPengajaran.location_description).toContain("Gedung Pengajaran");
      expect(posPengajaran.opening_hours).toContain("08:00 - 16:00 WIB");
      expect(posPengajaran.directions).toBeDefined();

      // Verify photos structure
      expect(Array.isArray(posPengajaran.photos)).toBe(true);
      if (posPengajaran.photos.length > 0) {
        const photo = posPengajaran.photos[0];
        expect(photo.position).toBe(1);
        expect(photo.is_cover).toBe(true);
        expect(photo.url).toContain("http");
        expect(photo.expires_at).toBeDefined();
      }

      // Verify PII exclusion: officer_user_id & storage_path MUST NOT exist
      expect(posPengajaran).not.toHaveProperty("officer_user_id");
      expect(posPengajaran).not.toHaveProperty("officerUserId");
      expect(posPengajaran).not.toHaveProperty("storage_path");
      expect(posPengajaran).not.toHaveProperty("storageLimitDays");
    });

    it("should support query parameters page and limit", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/posts?page=1&limit=5",
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.body);
      expect(json.meta.page).toBe(1);
      expect(json.meta.limit).toBe(5);
    });

    it("should respond 400 BAD_REQUEST when limit exceeds 10 (OpenAPI maximum)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/posts?limit=11",
      });

      expect(response.statusCode).toBe(400);
      const json = JSON.parse(response.body);
      expect(json).toHaveProperty("error");
      expect(json.error.code).toBe("INVALID_QUERY_PARAMS");
      expect(json.error.request_id).toBeDefined();
    });

    it("should respond 400 BAD_REQUEST when page is less than 1", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/posts?page=0",
      });

      expect(response.statusCode).toBe(400);
      const json = JSON.parse(response.body);
      expect(json.error.code).toBe("INVALID_QUERY_PARAMS");
    });
  });

  describe("B/C.1.2: GET /api/v1/posts/:post_id", () => {
    it("should respond 200 OK with single post detail and photo gallery", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/posts/1",
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.body);

      expect(json).toHaveProperty("data");
      expect(json.data.post_id).toBe(1);
      expect(json.data.name).toBe("Pos Pengajaran");
      expect(Array.isArray(json.data.photos)).toBe(true);

      // Verify no PII leak
      expect(json.data).not.toHaveProperty("officer_user_id");
      expect(json.data).not.toHaveProperty("storage_path");
    });

    it("should respond 404 POST_NOT_FOUND when post does not exist", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/posts/999999",
      });

      expect(response.statusCode).toBe(404);
      const json = JSON.parse(response.body);
      expect(json.error.code).toBe("POST_NOT_FOUND");
      expect(json.error.message).toContain("999999");
      expect(json.error.request_id).toBeDefined();
    });

    it("should respond 400 INVALID_PARAMETER when post_id is not positive integer", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/posts/invalid-id",
      });

      expect(response.statusCode).toBe(400);
      const json = JSON.parse(response.body);
      expect(json.error.code).toBe("INVALID_PARAMETER");
    });
  });
});
