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

export const returnRecordDtoSchema = z
  .object({
    return_id: z.string().uuid(),
    item_id: z.string().uuid(),
    recipient_name: z.string(),
    recipient_identifier: z.string().nullable().optional(),
    verification_summary: z.string(),
    verification_confirmed_at: z.string().datetime(),
    returned_at: z.string().datetime(),
    returned_by_name: z.string().nullable().optional(),
  })
  .strict();
export type ReturnRecordDto = z.infer<typeof returnRecordDtoSchema>;

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
    storage_limit_days: z.number().int().positive().nullable().optional(),
    archived_at: z.string().datetime().nullable().optional(),
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
    return_record: returnRecordDtoSchema.nullable().optional(),
  })
  .strict();

export type InventoryOfficerDto = z.infer<typeof inventoryOfficerDtoSchema>;

export const itemCreateResponseSchema = z
  .object({
    data: inventoryOfficerDtoSchema,
  })
  .strict();

export const inventoryResponseSchema = itemCreateResponseSchema;

export const inventoryListResponseSchema = z
  .object({
    data: z.array(inventoryOfficerDtoSchema),
    meta: z.object({
      page: z.number().int(),
      limit: z.number().int(),
      total: z.number().int(),
      total_pages: z.number().int(),
    }),
  })
  .strict();

// B/I: Receive Request Schema
export const receiveRequestSchema = z
  .object({
    public_description: z.string().trim().min(1, "Deskripsi publik tidak boleh kosong"),
    private_verification_notes: z.string().trim().nullable().optional(),
    item_photo_upload_tokens: z
      .array(z.string().min(1))
      .max(1, "Maksimal 1 token foto yang diperbolehkan")
      .optional(),
  })
  .strict();
export type ReceiveRequest = z.infer<typeof receiveRequestSchema>;

// Reason Request Schema (for reject submission)
export const reasonRequestSchema = z
  .object({
    reason: z.string().trim().min(1, "Alasan wajib diisi").max(2000),
  })
  .strict();
export type ReasonRequest = z.infer<typeof reasonRequestSchema>;

// B/G: Visibility Request Schema
export const visibilityRequestSchema = z
  .object({
    is_visible: z.boolean(),
  })
  .strict();
export type VisibilityRequest = z.infer<typeof visibilityRequestSchema>;

// B/J: Return Request Schema
export const returnRequestSchema = z
  .object({
    recipient_name: z.string().trim().min(1, "Nama penerima tidak boleh kosong").max(120),
    recipient_identifier: z.string().trim().max(50).nullable().optional(),
    verification_summary: z
      .string()
      .trim()
      .min(1, "Ringkasan verifikasi kepemilikan tidak boleh kosong")
      .max(5000),
  })
  .strict();
export type ReturnRequest = z.infer<typeof returnRequestSchema>;

export const returnResponseSchema = z
  .object({
    data: returnRecordDtoSchema,
  })
  .strict();

// B/G: Overdue Inventory DTO Schema
export const overdueInventoryDtoSchema = z
  .object({
    item_id: z.string().uuid(),
    inventory_code: z.string(),
    item_name: z.string(),
    category: z.string(),
    received_at: z.string().datetime(),
    storage_limit_days: z.number().int().nullable(),
    storage_age_days: z.number().int(),
    overdue_days: z.number().int(),
  })
  .strict();
export type OverdueInventoryDto = z.infer<typeof overdueInventoryDtoSchema>;

export const overdueResponseSchema = z
  .object({
    data: z.array(overdueInventoryDtoSchema),
  })
  .strict();

export const postSettingsDtoSchema = z
  .object({
    post_id: z.number().int(),
    name: z.string(),
    storage_limit_days: z.number().int().min(1).max(730),
  })
  .strict();
export type PostSettingsDto = z.infer<typeof postSettingsDtoSchema>;

export const postSettingsResponseSchema = z
  .object({
    data: postSettingsDtoSchema,
  })
  .strict();

export const postSettingsUpdateSchema = z
  .object({
    storage_limit_days: z
      .number({ invalid_type_error: "Batas hari penyimpanan harus berupa angka" })
      .int("Batas hari penyimpanan harus berupa bilangan bulat")
      .min(1, "Minimal batas simpan adalah 1 hari")
      .max(730, "Maksimal batas simpan adalah 730 hari (2 tahun)"),
  })
  .strict();
export type PostSettingsUpdateRequest = z.infer<typeof postSettingsUpdateSchema>;

export const cleanInventoryRequestSchema = z
  .object({
    month: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Format bulan harus YYYY-MM")
      .optional(),
  })
  .strict();
export type CleanInventoryRequest = z.infer<typeof cleanInventoryRequestSchema>;

export const cleanInventoryResponseSchema = z
  .object({
    data: z.object({
      archived_count: z.number().int().nonnegative(),
    }),
  })
  .strict();
