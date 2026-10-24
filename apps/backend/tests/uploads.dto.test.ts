import { describe, it, expect } from "vitest";
import {
  uploadIntentRequestSchema,
  uploadIntentResponseSchema,
  uploadFinalizedResponseSchema,
  uploadIdParamSchema,
  MAX_UPLOAD_SIZE_BYTES,
} from "../src/modules/uploads/uploads.dto.js";

describe("Uploads DTO Contract (OpenAPI v1.0 parity)", () => {
  describe("UploadIntentRequest Schema", () => {
    it("accepts valid OFFICER ITEM_PHOTO intent request", () => {
      const valid = {
        purpose: "ITEM_PHOTO",
        content_type: "image/jpeg",
        size_bytes: 1024 * 500, // 500 KiB
      };

      const result = uploadIntentRequestSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("accepts valid STUDENT REPORT_PHOTO intent request with webp", () => {
      const valid = {
        purpose: "REPORT_PHOTO",
        content_type: "image/webp",
        size_bytes: 1024 * 1024 * 2, // 2 MiB
      };

      const result = uploadIntentRequestSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects invalid purpose enum (e.g. POST_PHOTO or AVATAR)", () => {
      const invalid = {
        purpose: "POST_PHOTO",
        content_type: "image/jpeg",
        size_bytes: 1024,
      };

      const result = uploadIntentRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects non-allowlisted MIME content_type (e.g. image/gif or application/pdf)", () => {
      const invalidGif = {
        purpose: "ITEM_PHOTO",
        content_type: "image/gif",
        size_bytes: 1024,
      };
      expect(uploadIntentRequestSchema.safeParse(invalidGif).success).toBe(false);

      const invalidPdf = {
        purpose: "ITEM_PHOTO",
        content_type: "application/pdf",
        size_bytes: 1024,
      };
      expect(uploadIntentRequestSchema.safeParse(invalidPdf).success).toBe(false);
    });

    it("rejects size <= 0 or > 5 MiB", () => {
      const zeroSize = {
        purpose: "ITEM_PHOTO",
        content_type: "image/png",
        size_bytes: 0,
      };
      expect(uploadIntentRequestSchema.safeParse(zeroSize).success).toBe(false);

      const oversized = {
        purpose: "ITEM_PHOTO",
        content_type: "image/png",
        size_bytes: MAX_UPLOAD_SIZE_BYTES + 1,
      };
      expect(uploadIntentRequestSchema.safeParse(oversized).success).toBe(false);
    });

    it("rejects unexpected fields (strict schema)", () => {
      const extraFields = {
        purpose: "ITEM_PHOTO",
        content_type: "image/jpeg",
        size_bytes: 1024,
        storage_path: "malicious/override.jpg",
      };

      const result = uploadIntentRequestSchema.safeParse(extraFields);
      expect(result.success).toBe(false);
    });
  });

  describe("UploadIntentResponse Schema", () => {
    it("validates OpenAPI-compliant UploadIntent structure", () => {
      const payload = {
        data: {
          upload_id: "c7a8b9d0-1234-5678-90ab-cdef12345678",
          put_url: "https://r2.example.com/lostandfound/items/photo.jpg?signature=xyz",
          expires_at: new Date().toISOString(),
          required_headers: {
            "Content-Type": "image/jpeg",
          },
        },
      };

      const result = uploadIntentResponseSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe("UploadFinalizedResponse Schema", () => {
    it("validates OpenAPI-compliant UploadFinalized structure", () => {
      const payload = {
        data: {
          upload_token: "signed.upload.token.jwt",
          purpose: "ITEM_PHOTO",
          expires_at: new Date().toISOString(),
        },
      };

      const result = uploadFinalizedResponseSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe("UploadIdParam Schema", () => {
    it("validates UUID upload_id param", () => {
      expect(
        uploadIdParamSchema.safeParse({
          upload_id: "c7a8b9d0-1234-5678-90ab-cdef12345678",
        }).success
      ).toBe(true);

      expect(
        uploadIdParamSchema.safeParse({
          upload_id: "not-a-valid-uuid",
        }).success
      ).toBe(false);
    });
  });
});
