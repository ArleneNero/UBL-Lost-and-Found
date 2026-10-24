import { describe, it, expect } from "vitest";
import {
  itemCreateRequestSchema,
  inventoryOfficerDtoSchema,
} from "../src/modules/officer/officer.dto.js";

describe("Officer DTO Contract (OpenAPI v1.0 parity)", () => {
  describe("ItemCreateRequest Schema", () => {
    it("accepts valid ItemCreateRequest with all optional fields", () => {
      const valid = {
        item_name: "Kunci Motor Vario Hitam",
        category: "Aksesori",
        public_description: "Kunci motor gantungan boneka beruang",
        private_verification_notes: "Ada remote alarm dan stiker nomor seri",
        found_location: "Parkiran Bawah Gedung Pengajaran",
        found_on: "2026-10-25",
        item_photo_upload_tokens: ["valid-upload-token-sample-1234"],
      };

      const result = itemCreateRequestSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("accepts valid ItemCreateRequest with optional fields omitted or null", () => {
      const validMinimal = {
        item_name: "Jaket Hitam",
        category: "Pakaian",
        public_description: "Jaket warna hitam tertinggal di kantin",
        private_verification_notes: null,
        found_location: null,
        found_on: null,
        item_photo_upload_tokens: ["token-abc-999"],
      };

      const result = itemCreateRequestSchema.safeParse(validMinimal);
      expect(result.success).toBe(true);
    });

    it("rejects empty item_name", () => {
      const invalid = {
        item_name: "   ",
        category: "Elektronik",
        public_description: "Flashdisk",
        item_photo_upload_tokens: ["token-1"],
      };

      const result = itemCreateRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects empty category", () => {
      const invalid = {
        item_name: "Flashdisk",
        category: "",
        public_description: "Flashdisk 32GB",
        item_photo_upload_tokens: ["token-1"],
      };

      const result = itemCreateRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects invalid date format for found_on", () => {
      const invalid = {
        item_name: "Dompet",
        category: "Aksesori",
        public_description: "Dompet cokelat",
        found_on: "25-10-2026", // Not YYYY-MM-DD
        item_photo_upload_tokens: ["token-1"],
      };

      const result = itemCreateRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects when item_photo_upload_tokens is empty", () => {
      const invalid = {
        item_name: "Tumbler",
        category: "Aksesori",
        public_description: "Tumbler hitam",
        item_photo_upload_tokens: [],
      };

      const result = itemCreateRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects when item_photo_upload_tokens contains more than 1 token", () => {
      const invalid = {
        item_name: "Tumbler",
        category: "Aksesori",
        public_description: "Tumbler hitam",
        item_photo_upload_tokens: ["token-1", "token-2"],
      };

      const result = itemCreateRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects unknown properties in strict mode (e.g. post_id spoofing attempt)", () => {
      const invalid = {
        item_name: "Tumbler",
        category: "Aksesori",
        public_description: "Tumbler hitam",
        post_id: 999, // Should be rejected by .strict()
        item_photo_upload_tokens: ["token-1"],
      };

      const result = itemCreateRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("InventoryOfficerDto Schema", () => {
    it("validates valid officer inventory response structure", () => {
      const validDto = {
        item_id: "550e8400-e29b-41d4-a716-446655440000",
        inventory_code: "INV-2026-0001",
        item_name: "Laptop Asus",
        category: "Elektronik",
        public_description: "Laptop Asus Zenbook biru",
        private_verification_notes: "Serial SN-12345",
        found_location: "Lab ICT",
        found_on: "2026-10-20",
        received_at: "2026-10-20T10:00:00.000Z",
        status: "STORED",
        is_visible: true,
        storage_post_id: 1,
        source_submission_id: null,
        post: {
          post_id: 1,
          name: "Pos Pengajaran",
        },
        photos: [
          {
            photo_id: "660e8400-e29b-41d4-a716-446655440001",
            url: "https://r2.campusfind.local/items/sample.webp",
            expires_at: "2026-10-20T11:00:00.000Z",
            is_primary: true,
          },
        ],
      };

      const result = inventoryOfficerDtoSchema.safeParse(validDto);
      expect(result.success).toBe(true);
    });
  });
});
