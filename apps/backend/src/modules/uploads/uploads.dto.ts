import { z } from "zod";

export const uploadPurposeEnum = z.enum(["REPORT_PHOTO", "ITEM_PHOTO"]);
export type UploadPurpose = z.infer<typeof uploadPurposeEnum>;

export const uploadContentTypeEnum = z.enum([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
export type UploadContentType = z.infer<typeof uploadContentTypeEnum>;

export const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024; // 5 MiB (5,242,880 bytes)

export const uploadIntentRequestSchema = z
  .object({
    purpose: uploadPurposeEnum,
    content_type: uploadContentTypeEnum,
    size_bytes: z.number().int().min(1).max(MAX_UPLOAD_SIZE_BYTES),
  })
  .strict();
export type UploadIntentRequest = z.infer<typeof uploadIntentRequestSchema>;

export const uploadIntentSchema = z
  .object({
    upload_id: z.string().uuid(),
    put_url: z.string().url(),
    expires_at: z.string().datetime(),
    required_headers: z.record(z.string()),
  })
  .strict();
export type UploadIntent = z.infer<typeof uploadIntentSchema>;

export const uploadIntentResponseSchema = z
  .object({
    data: uploadIntentSchema,
  })
  .strict();
export type UploadIntentResponse = z.infer<typeof uploadIntentResponseSchema>;

export const uploadFinalizedSchema = z
  .object({
    upload_token: z.string().min(1),
    purpose: uploadPurposeEnum,
    expires_at: z.string().datetime(),
  })
  .strict();
export type UploadFinalized = z.infer<typeof uploadFinalizedSchema>;

export const uploadFinalizedResponseSchema = z
  .object({
    data: uploadFinalizedSchema,
  })
  .strict();
export type UploadFinalizedResponse = z.infer<typeof uploadFinalizedResponseSchema>;

export const uploadIdParamSchema = z
  .object({
    upload_id: z.string().uuid(),
  })
  .strict();
export type UploadIdParam = z.infer<typeof uploadIdParamSchema>;
