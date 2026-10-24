import { z } from "zod";
import { servicePostShortSchema, paginationMetaSchema } from "../posts/posts.dto.js";

// 1. Item Photo Schema (min 1, max 1 in catalog/public detail response)
export const itemPhotoSchema = z.object({
  photo_id: z.string().uuid(),
  url: z.string().url(),
  expires_at: z.string().datetime(),
  is_primary: z.boolean(),
});
export type ItemPhoto = z.infer<typeof itemPhotoSchema>;

// 2. Found Item Public Schema (OpenAPI allowlist only)
export const foundItemPublicSchema = z.object({
  item_id: z.string().uuid(),
  inventory_code: z.string(),
  item_name: z.string(),
  category: z.string(),
  public_description: z.string(),
  found_location: z.string().nullable(),
  found_on: z.string().nullable(),
  received_at: z.string().datetime(),
  post: servicePostShortSchema,
  photos: z.array(itemPhotoSchema).min(1).max(1),
});
export type FoundItemPublic = z.infer<typeof foundItemPublicSchema>;

// 3. Response Envelopes
export const itemsResponseSchema = z.object({
  data: z.array(foundItemPublicSchema),
  meta: paginationMetaSchema,
});
export type ItemsResponse = z.infer<typeof itemsResponseSchema>;

export const itemResponseSchema = z.object({
  data: foundItemPublicSchema,
});
export type ItemResponse = z.infer<typeof itemResponseSchema>;

// 4. Query and Param validation schemas
export const listItemsQuerySchema = z.object({
  page: z.coerce.number().int().min(1, "Halaman minimal 1").default(1),
  limit: z.coerce.number().int().min(1, "Limit minimal 1").max(10, "Limit maksimal 10").default(10),
  q: z.string().max(120, "Kata kunci pencarian maksimal 120 karakter").optional(),
  category: z.string().max(80, "Kategori maksimal 80 karakter").optional(),
  post_id: z.coerce.number().int().min(1, "ID pos pelayanan harus berupa bilangan positif").optional(),
  sort: z
    .enum(["received_at_desc", "received_at_asc", "item_name_asc"], {
      errorMap: () => ({ message: "Opsi sort tidak valid" }),
    })
    .default("received_at_desc"),
});
export type ListItemsQuery = z.infer<typeof listItemsQuerySchema>;

export const itemParamSchema = z.object({
  item_id: z.string().uuid("ID barang harus berupa UUID yang valid"),
});
export type ItemParam = z.infer<typeof itemParamSchema>;
