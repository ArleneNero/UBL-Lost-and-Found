import { describe, it, expect } from "vitest";
import {
  servicePostPublicSchema,
  servicePostPhotoSchema,
  postsResponseSchema,
  postResponseSchema,
  listPostsQuerySchema,
  postParamSchema,
} from "../src/modules/posts/posts.dto.js";

describe("B/C.1.0 — Public DTO Schema & PII Leak Protection", () => {
  it("should validate a conforming ServicePostPhoto", () => {
    const validPhoto = {
      photo_id: "e73978d8-9794-45fe-b428-6d6ec85346ec",
      position: 1,
      is_cover: true,
      url: "https://r2.campusfind.budiluhur.ac.id/posts/cover.webp?exp=1792830000",
      expires_at: "2026-10-25T00:00:00.000Z",
    };

    const result = servicePostPhotoSchema.safeParse(validPhoto);
    expect(result.success).toBe(true);
  });

  it("should reject photo position outside 1..3", () => {
    const invalidPhoto = {
      photo_id: "e73978d8-9794-45fe-b428-6d6ec85346ec",
      position: 4,
      is_cover: false,
      url: "https://r2.campusfind.budiluhur.ac.id/posts/photo4.webp",
      expires_at: "2026-10-25T00:00:00.000Z",
    };

    const result = servicePostPhotoSchema.safeParse(invalidPhoto);
    expect(result.success).toBe(false);
  });

  it("should validate a conforming ServicePostPublic", () => {
    const validPost = {
      post_id: 1,
      name: "Pos Pengajaran",
      location_description: "Gedung Pengajaran Lt. 1",
      opening_hours: "08:00 - 16:00 WIB",
      directions: "Dari gerbang utama jalan lurus",
      photos: [
        {
          photo_id: "e73978d8-9794-45fe-b428-6d6ec85346ec",
          position: 1,
          is_cover: true,
          url: "https://r2.campusfind.budiluhur.ac.id/posts/cover.webp",
          expires_at: "2026-10-25T00:00:00.000Z",
        },
      ],
    };

    const result = servicePostPublicSchema.safeParse(validPost);
    expect(result.success).toBe(true);
  });

  it("should strictly prevent PII leaks (officer_user_id, storage_path, storage_limit_days)", () => {
    // If an internal DB object with private fields is passed, ensure the DTO schema only allows public allowlist
    const rawDbObject = {
      post_id: 1,
      name: "Pos Pengajaran",
      officer_user_id: "157c0aa0-a39a-49bd-a559-7777b20de64c", // PRIVATE
      storage_limit_days: 30, // PRIVATE
      location_description: "Gedung Pengajaran Lt. 1",
      opening_hours: "08:00 - 16:00 WIB",
      directions: "Dari gerbang utama",
      photos: [],
    };

    // Parse strips unknown/private fields
    const parsed = servicePostPublicSchema.parse(rawDbObject);
    expect(parsed).not.toHaveProperty("officer_user_id");
    expect(parsed).not.toHaveProperty("storage_limit_days");
    expect(Object.keys(parsed)).toEqual([
      "post_id",
      "name",
      "location_description",
      "opening_hours",
      "directions",
      "photos",
    ]);
  });

  it("should validate query parameters and enforce max limit = 10", () => {
    expect(listPostsQuerySchema.safeParse({ page: 1, limit: 10 }).success).toBe(true);
    expect(listPostsQuerySchema.safeParse({ page: 1, limit: 5 }).success).toBe(true);
    expect(listPostsQuerySchema.safeParse({ page: 1, limit: 11 }).success).toBe(false);
    expect(listPostsQuerySchema.safeParse({ page: 0, limit: 10 }).success).toBe(false);
  });

  it("should validate path parameter post_id", () => {
    expect(postParamSchema.safeParse({ post_id: "1" }).success).toBe(true);
    expect(postParamSchema.safeParse({ post_id: "0" }).success).toBe(false);
    expect(postParamSchema.safeParse({ post_id: "-5" }).success).toBe(false);
    expect(postParamSchema.safeParse({ post_id: "abc" }).success).toBe(false);
  });
});
