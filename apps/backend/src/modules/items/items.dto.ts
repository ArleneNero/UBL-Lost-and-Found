import { z } from "zod";
import { servicePostShortSchema } from "../posts/posts.dto.js";

// Item Photo Schema (min 1, max 1 in catalog/public detail response)
export const itemPhotoSchema = z.object({
  photo_id: z.string().uuid(),
  url: z.string().url(),
  expires_at: z.string().datetime(),
  is_primary: z.boolean(),
});
export type ItemPhoto = z.infer<typeof itemPhotoSchema>;

// Found Item Public Schema (OpenAPI allowlist only)
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
