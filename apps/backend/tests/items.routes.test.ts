import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import { FastifyInstance } from "fastify";
import { pool, db } from "../src/db/index.js";
import { foundItems } from "../src/db/schema.js";
import { eq } from "drizzle-orm";

describe("B/C.2 — Public Catalog & Detail Items APIs", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  describe("B/C.2.0: GET /api/v1/items (Listing & Filtering)", () => {
    it("should respond 200 OK with list of public items and pagination metadata", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/items",
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json).toHaveProperty("data");
      expect(json).toHaveProperty("meta");
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.meta.page).toBe(1);
      expect(json.meta.limit).toBe(10);
      expect(json.meta.total).toBeGreaterThanOrEqual(12);
      expect(json.data.length).toBeLessThanOrEqual(10);

      // Verify each item follows FoundItemPublic schema
      const firstItem = json.data[0];
      expect(firstItem).toHaveProperty("item_id");
      expect(firstItem).toHaveProperty("inventory_code");
      expect(firstItem).toHaveProperty("item_name");
      expect(firstItem).toHaveProperty("category");
      expect(firstItem).toHaveProperty("public_description");
      expect(firstItem).toHaveProperty("received_at");
      expect(firstItem).toHaveProperty("post");
      expect(firstItem.post).toHaveProperty("post_id");
      expect(firstItem.post).toHaveProperty("name");
      expect(firstItem).toHaveProperty("photos");
      expect(firstItem.photos.length).toBe(1);
      expect(firstItem.photos[0].is_primary).toBe(true);
      expect(firstItem.photos[0].url).toContain("http");

      // Verify ZERO PII leakage
      expect(firstItem).not.toHaveProperty("recorded_by_user_id");
      expect(firstItem).not.toHaveProperty("recordedByUserId");
      expect(firstItem).not.toHaveProperty("private_verification_notes");
      expect(firstItem).not.toHaveProperty("privateVerificationNotes");
      expect(firstItem).not.toHaveProperty("source_submission_id");
    });

    it("should paginate correctly with custom limit and page", async () => {
      const page1Res = await app.inject({
        method: "GET",
        url: "/api/v1/items?page=1&limit=5",
      });
      expect(page1Res.statusCode).toBe(200);
      const page1 = page1Res.json();
      expect(page1.data.length).toBe(5);
      expect(page1.meta.page).toBe(1);
      expect(page1.meta.limit).toBe(5);

      const page2Res = await app.inject({
        method: "GET",
        url: "/api/v1/items?page=2&limit=5",
      });
      expect(page2Res.statusCode).toBe(200);
      const page2 = page2Res.json();
      expect(page2.data.length).toBe(5);
      expect(page2.meta.page).toBe(2);

      // Assert pages have mutually exclusive items
      const page1Ids = page1.data.map((i: any) => i.item_id);
      const page2Ids = page2.data.map((i: any) => i.item_id);
      for (const id of page2Ids) {
        expect(page1Ids).not.toContain(id);
      }
    });

    it("should filter items by category (case-insensitive)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/items?category=Elektronik",
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.data.length).toBeGreaterThan(0);
      for (const item of json.data) {
        expect(item.category.toLowerCase()).toBe("elektronik");
      }
    });

    it("should filter items by post_id", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/items?post_id=1",
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.data.length).toBeGreaterThan(0);
      for (const item of json.data) {
        expect(item.post.post_id).toBe(1);
      }
    });

    it("should search items by keyword q in itemName or publicDescription", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/items?q=Asus",
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.data.length).toBeGreaterThan(0);
      expect(json.data.some((item: any) => item.item_name.includes("Asus"))).toBe(true);
    });

    it("should handle defensive search and SQL injection attempts safely", async () => {
      const payloads = [
        "'; DROP TABLE found_items; --",
        "' OR '1'='1",
        "UNION SELECT null, null, null --",
        "%_%",
      ];

      for (const payload of payloads) {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/items?q=${encodeURIComponent(payload)}`,
        });

        expect(response.statusCode).toBe(200);
        const json = response.json();
        expect(Array.isArray(json.data)).toBe(true);
      }
    });

    it("should respect sort allowlist with item_id tie-breaker", async () => {
      // 1. received_at_asc
      const ascRes = await app.inject({
        method: "GET",
        url: "/api/v1/items?sort=received_at_asc&limit=10",
      });
      expect(ascRes.statusCode).toBe(200);
      const ascItems = ascRes.json().data;
      for (let i = 0; i < ascItems.length - 1; i++) {
        const curr = new Date(ascItems[i].received_at).getTime();
        const next = new Date(ascItems[i + 1].received_at).getTime();
        expect(curr).toBeLessThanOrEqual(next);
      }

      // 2. item_name_asc
      const nameRes = await app.inject({
        method: "GET",
        url: "/api/v1/items?sort=item_name_asc&limit=10",
      });
      expect(nameRes.statusCode).toBe(200);
      const nameItems = nameRes.json().data;
      for (let i = 0; i < nameItems.length - 1; i++) {
        expect(nameItems[i].item_name <= nameItems[i + 1].item_name).toBe(true);
      }
    });

    it("should NEVER return hidden items (is_visible = false) or non-STORED items in /items", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/items?limit=10&page=1",
      });

      expect(response.statusCode).toBe(200);
      const items = response.json().data;
      const codes = items.map((i: any) => i.inventory_code);

      expect(codes).not.toContain("INV-2026-HIDDEN");
      expect(codes).not.toContain("INV-2026-RET");
      expect(codes).not.toContain("INV-2026-DIST");
    });

    it("should return 400 INVALID_QUERY_PARAMS for invalid query parameters", async () => {
      // limit > 10
      const resLimit = await app.inject({
        method: "GET",
        url: "/api/v1/items?limit=15",
      });
      expect(resLimit.statusCode).toBe(400);
      expect(resLimit.json().error.code).toBe("INVALID_QUERY_PARAMS");

      // page < 1
      const resPage = await app.inject({
        method: "GET",
        url: "/api/v1/items?page=0",
      });
      expect(resPage.statusCode).toBe(400);
      expect(resPage.json().error.code).toBe("INVALID_QUERY_PARAMS");

      // invalid sort
      const resSort = await app.inject({
        method: "GET",
        url: "/api/v1/items?sort=unknown_order",
      });
      expect(resSort.statusCode).toBe(400);
      expect(resSort.json().error.code).toBe("INVALID_QUERY_PARAMS");
    });
  });

  describe("B/C.2.1: GET /api/v1/items/:item_id (Public Detail & Negative Privacy)", () => {
    it("should return 200 OK with single public item detail for a valid stored visible item", async () => {
      // Fetch item id for INV-2026-0001 from database
      const item = await db.query.foundItems.findFirst({
        where: eq(foundItems.inventoryCode, "INV-2026-0001"),
      });
      expect(item).toBeDefined();

      const response = await app.inject({
        method: "GET",
        url: `/api/v1/items/${item!.itemId}`,
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json).toHaveProperty("data");
      expect(json.data.item_id).toBe(item!.itemId);
      expect(json.data.inventory_code).toBe("INV-2026-0001");
      expect(json.data.photos.length).toBe(1);
      expect(json.data.photos[0].is_primary).toBe(true);
      expect(json.data.post.post_id).toBe(item!.storagePostId);

      // Verify no PII
      expect(json.data.recorded_by_user_id).toBeUndefined();
      expect(json.data.private_verification_notes).toBeUndefined();
    });

    it("should return 404 ITEM_NOT_FOUND when item does not exist", async () => {
      const nonExistentUUID = "00000000-0000-4000-8000-000000000000";
      const response = await app.inject({
        method: "GET",
        url: `/api/v1/items/${nonExistentUUID}`,
      });

      expect(response.statusCode).toBe(404);
      const json = response.json();
      expect(json.error.code).toBe("ITEM_NOT_FOUND");
      expect(json.error).toHaveProperty("request_id");
    });

    it("should return 404 ITEM_NOT_FOUND (not 403 or 200) for a hidden item (is_visible = false)", async () => {
      const hiddenItem = await db.query.foundItems.findFirst({
        where: eq(foundItems.inventoryCode, "INV-2026-HIDDEN"),
      });
      expect(hiddenItem).toBeDefined();

      const response = await app.inject({
        method: "GET",
        url: `/api/v1/items/${hiddenItem!.itemId}`,
      });

      // Must be masked as 404
      expect(response.statusCode).toBe(404);
      expect(response.json().error.code).toBe("ITEM_NOT_FOUND");
    });

    it("should return 404 ITEM_NOT_FOUND for non-STORED item (RETURNED_TO_OWNER)", async () => {
      const returnedItem = await db.query.foundItems.findFirst({
        where: eq(foundItems.inventoryCode, "INV-2026-RET"),
      });
      expect(returnedItem).toBeDefined();

      const response = await app.inject({
        method: "GET",
        url: `/api/v1/items/${returnedItem!.itemId}`,
      });

      expect(response.statusCode).toBe(404);
      expect(response.json().error.code).toBe("ITEM_NOT_FOUND");
    });

    it("should return 404 ITEM_NOT_FOUND for non-STORED item (DISTRIBUTED)", async () => {
      const distItem = await db.query.foundItems.findFirst({
        where: eq(foundItems.inventoryCode, "INV-2026-DIST"),
      });
      expect(distItem).toBeDefined();

      const response = await app.inject({
        method: "GET",
        url: `/api/v1/items/${distItem!.itemId}`,
      });

      expect(response.statusCode).toBe(404);
      expect(response.json().error.code).toBe("ITEM_NOT_FOUND");
    });

    it("should return 400 INVALID_PARAMETER when item_id is not a valid UUID", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/items/not-a-valid-uuid",
      });

      expect(response.statusCode).toBe(400);
      const json = response.json();
      expect(json.error.code).toBe("INVALID_PARAMETER");
    });
  });
});
