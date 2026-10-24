import { describe, it, expect } from "vitest";
import {
  foundItemPublicSchema,
  listItemsQuerySchema,
  itemParamSchema,
  itemPhotoSchema,
  itemsResponseSchema,
  itemResponseSchema,
} from "../src/modules/items/items.dto.js";

describe("B/C.2 — Public Items & Catalog DTO Verification", () => {
  const validUUID = "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d";
  const validPhotoUUID = "b2c3d4e5-f6a7-4b6c-9d0e-1f2a3b4c5d6e";

  const validPhoto = {
    photo_id: validPhotoUUID,
    url: "https://r2.campusfind.local/items/test.webp?token=xyz",
    expires_at: new Date().toISOString(),
    is_primary: true,
  };

  const validPublicItem = {
    item_id: validUUID,
    inventory_code: "INV-2026-0001",
    item_name: "Laptop Asus Zenbook Biru",
    category: "Elektronik",
    public_description: "Laptop Asus warna biru gelap dengan stiker Budi Luhur",
    found_location: "Lab ICT Lt. 3",
    found_on: "2026-10-15",
    received_at: new Date().toISOString(),
    post: {
      post_id: 1,
      name: "Pos Pengajaran",
    },
    photos: [validPhoto],
  };

  it("should validate a conforming FoundItemPublic DTO", () => {
    const result = foundItemPublicSchema.safeParse(validPublicItem);
    expect(result.success).toBe(true);
  });

  it("should enforce photo cardinality: exactly 1 photo allowed for catalog/public item", () => {
    // 0 photos -> fail
    const zeroPhotos = { ...validPublicItem, photos: [] };
    expect(foundItemPublicSchema.safeParse(zeroPhotos).success).toBe(false);

    // 2 photos -> fail
    const twoPhotos = { ...validPublicItem, photos: [validPhoto, validPhoto] };
    expect(foundItemPublicSchema.safeParse(twoPhotos).success).toBe(false);
  });

  it("should validate query defaults: page=1, limit=10, sort=received_at_desc", () => {
    const parsed = listItemsQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(10);
    expect(parsed.sort).toBe("received_at_desc");
  });

  it("should reject query limit exceeding OpenAPI maximum of 10", () => {
    const result = listItemsQuerySchema.safeParse({ limit: 11 });
    expect(result.success).toBe(false);
  });

  it("should reject invalid query parameters (negative page, invalid sort enum, overly long q)", () => {
    expect(listItemsQuerySchema.safeParse({ page: 0 }).success).toBe(false);
    expect(listItemsQuerySchema.safeParse({ sort: "invalid_sort" }).success).toBe(false);
    expect(
      listItemsQuerySchema.safeParse({ q: "a".repeat(121) }).success
    ).toBe(false);
  });

  it("should validate path parameter: UUID format required for item_id", () => {
    expect(itemParamSchema.safeParse({ item_id: validUUID }).success).toBe(true);
    expect(itemParamSchema.safeParse({ item_id: "not-a-uuid" }).success).toBe(false);
    expect(itemParamSchema.safeParse({ item_id: "12345" }).success).toBe(false);
  });

  it("should validate full items response and item response envelopes", () => {
    const itemsEnvelope = {
      data: [validPublicItem],
      meta: {
        page: 1,
        limit: 10,
        total: 1,
        total_pages: 1,
      },
    };
    expect(itemsResponseSchema.safeParse(itemsEnvelope).success).toBe(true);

    const itemEnvelope = {
      data: validPublicItem,
    };
    expect(itemResponseSchema.safeParse(itemEnvelope).success).toBe(true);
  });
});
