import { z } from "zod";

export function isValidCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;

  const utcDate = new Date(Date.UTC(year, month - 1, day));
  return (
    utcDate.getUTCFullYear() === year &&
    utcDate.getUTCMonth() === month - 1 &&
    utcDate.getUTCDate() === day
  );
}

export const reportStatusSchema = z.enum([
  "PENDING_RECEIPT",
  "RECEIVED",
  "REJECTED",
  "CANCELLED",
]);
export type ReportStatus = z.infer<typeof reportStatusSchema>;

export const submissionListQuerySchema = z.object({
  status: reportStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
export type SubmissionListQuery = z.infer<typeof submissionListQuerySchema>;

export const submissionCreateRequestSchema = z
  .object({
    target_post_id: z.number().int({ message: "Pos tujuan harus berupa ID integer valid" }),
    item_name: z.string().trim().min(1, "Nama barang tidak boleh kosong").max(150),
    category: z.string().trim().min(1, "Kategori tidak boleh kosong").max(80),
    public_description: z.string().trim().min(1, "Deskripsi publik tidak boleh kosong"),
    found_location: z.string().trim().min(1, "Lokasi temuan tidak boleh kosong"),
    found_on: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD")
      .refine(isValidCalendarDate, "Tanggal kalender tidak valid"),
    report_photo_upload_token: z.string().trim().min(1, "Token upload foto laporan wajib disertakan"),
  })
  .strict();

export type SubmissionCreateRequest = z.infer<typeof submissionCreateRequestSchema>;

export const reasonRequestSchema = z
  .object({
    reason: z.string().trim().min(1, "Alasan wajib diisi").max(2000),
  })
  .strict();

export type ReasonRequest = z.infer<typeof reasonRequestSchema>;

export const foundSubmissionDtoSchema = z
  .object({
    submission_id: z.string().uuid(),
    report_code: z.string().min(1),
    target_post_id: z.number().int(),
    item_name: z.string().min(1),
    category: z.string().min(1),
    public_description: z.string().min(1),
    found_location: z.string().min(1),
    found_on: z.string().min(1),
    status: reportStatusSchema,
    submitted_at: z.string().datetime(),
    report_photo_url: z.string(),
    report_photo_expires_at: z.string().datetime(),
  })
  .strict();

export type FoundSubmissionDto = z.infer<typeof foundSubmissionDtoSchema>;

export const statusHistoryDtoSchema = z
  .object({
    history_id: z.string().uuid(),
    from_status: reportStatusSchema.nullable(),
    to_status: reportStatusSchema,
    reason: z.string().nullable(),
    changed_at: z.string().datetime(),
  })
  .strict();

export type StatusHistoryDto = z.infer<typeof statusHistoryDtoSchema>;

export const reportWithHistoryDtoSchema = foundSubmissionDtoSchema
  .extend({
    history: z.array(statusHistoryDtoSchema),
  })
  .strict();

export type ReportWithHistoryDto = z.infer<typeof reportWithHistoryDtoSchema>;

export const submissionResponseSchema = z.object({
  data: foundSubmissionDtoSchema,
});

export const submissionDetailResponseSchema = z.object({
  data: reportWithHistoryDtoSchema,
});

export const submissionListResponseSchema = z.object({
  data: z.array(foundSubmissionDtoSchema),
  meta: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    total_pages: z.number().int(),
  }),
});
