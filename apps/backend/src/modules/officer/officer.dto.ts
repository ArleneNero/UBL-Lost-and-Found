import { z } from "zod";

export const itemCreateRequestSchema = z
  .object({
    item_name: z.string().trim().min(1, "Nama barang tidak boleh kosong").max(150),
    category: z.string().trim().min(1, "Kategori tidak boleh kosong").max(80),
    public_description: z.string().trim().min(1, "Deskripsi publik tidak boleh kosong"),
    private_verification_notes: z.string().trim().nullable().optional(),
    found_location: z.string().trim().nullable().optional(),
    found_on: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD")
      .nullable()
      .optional(),
    item_photo_upload_tokens: z
      .array(z.string().min(1))
      .length(1, "Pencatatan barang mewajibkan tepat 1 token foto"),
  })
  .strict();

export type ItemCreateRequest = z.infer<typeof itemCreateRequestSchema>;

export const inventoryOfficerDtoSchema = z
  .object({
    item_id: z.string().uuid(),
    inventory_code: z.string().min(1),
    item_name: z.string().min(1),
    category: z.string().min(1),
    public_description: z.string().min(1),
    private_verification_notes: z.string().nullable(),
    found_location: z.string().nullable(),
    found_on: z.string().nullable(),
    received_at: z.string().datetime(),
    status: z.enum(["STORED", "RETURNED_TO_OWNER", "DISTRIBUTED"]),
    is_visible: z.boolean(),
    storage_post_id: z.number().int(),
    source_submission_id: z.string().uuid().nullable(),
    post: z.object({
      post_id: z.number().int(),
      name: z.string(),
    }),
    photos: z.array(
      z.object({
        photo_id: z.string().uuid(),
        url: z.string().url(),
        expires_at: z.string().datetime(),
        is_primary: z.boolean(),
      })
    ),
  })
  .strict();

export type InventoryOfficerDto = z.infer<typeof inventoryOfficerDtoSchema>;

export const itemCreateResponseSchema = z
  .object({
    data: inventoryOfficerDtoSchema,
  })
  .strict();
