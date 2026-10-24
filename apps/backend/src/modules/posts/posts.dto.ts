import { z } from "zod";

// 1. Pagination Meta Schema
export const paginationMetaSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().min(0),
  total_pages: z.number().int().min(0),
});
export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

// 2. Service Post Photo Schema (max 3 per post, position 1..3, is_cover = position === 1)
export const servicePostPhotoSchema = z.object({
  photo_id: z.string().uuid(),
  position: z.number().int().min(1).max(3),
  is_cover: z.boolean(),
  url: z.string().url(),
  expires_at: z.string().datetime(),
});
export type ServicePostPhoto = z.infer<typeof servicePostPhotoSchema>;

// 3. Service Post Short Schema (used in item detail / catalog references)
export const servicePostShortSchema = z.object({
  post_id: z.number().int(),
  name: z.string(),
});
export type ServicePostShort = z.infer<typeof servicePostShortSchema>;

// 4. Service Post Public Schema
export const servicePostPublicSchema = z.object({
  post_id: z.number().int(),
  name: z.string(),
  location_description: z.string().nullable(),
  opening_hours: z.string().nullable(),
  directions: z.string().nullable(),
  photos: z.array(servicePostPhotoSchema).max(3),
});
export type ServicePostPublic = z.infer<typeof servicePostPublicSchema>;

// 5. Response Envelopes
export const postsResponseSchema = z.object({
  data: z.array(servicePostPublicSchema),
  meta: paginationMetaSchema,
});
export type PostsResponse = z.infer<typeof postsResponseSchema>;

export const postResponseSchema = z.object({
  data: servicePostPublicSchema,
});
export type PostResponse = z.infer<typeof postResponseSchema>;

// 6. Query and Param validation schemas
export const listPostsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(10).default(10),
});
export type ListPostsQuery = z.infer<typeof listPostsQuerySchema>;

export const postParamSchema = z.object({
  post_id: z.coerce.number().int().min(1, "ID Pos harus berupa bilangan bulat positif"),
});
export type PostParam = z.infer<typeof postParamSchema>;
