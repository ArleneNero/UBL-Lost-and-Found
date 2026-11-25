import { z } from "zod";

export const STUDENT_EMAIL_DOMAIN = "@student.budiluhur.ac.id";
export const STRICT_STUDENT_NIM_REGEX = /^\d{10}$/;

/**
 * Checks whether a student email ends with the official campus domain and has a strict 10-digit NIM local-part.
 */
export function isStrictStudentEmail(email: string): boolean {
  const normalized = (email || "").trim().toLowerCase();
  if (!normalized.endsWith(STUDENT_EMAIL_DOMAIN)) {
    return false;
  }
  const localPart = normalized.slice(0, normalized.length - STUDENT_EMAIL_DOMAIN.length);
  return STRICT_STUDENT_NIM_REGEX.test(localPart);
}

// 1. Me Schema (Canonical OpenAPI v1.0 allowlist)
export const meSchema = z.object({
  user_id: z.string().uuid(),
  full_name: z.string(),
  email: z.string().email(),
  student_number: z.string().nullable(),
  role: z.enum(["STUDENT", "OFFICER"]),
  assigned_post_id: z.number().int().nullable(),
  nim_verification_status: z.literal("NOT_VERIFIED"),
});
export type Me = z.infer<typeof meSchema>;

// 2. Response Envelope
export const meResponseSchema = z.object({
  data: meSchema,
});
export type MeResponse = z.infer<typeof meResponseSchema>;

// 3. Officer Login Request Schema
export const officerLoginSchema = z.object({
  email: z.string().trim().email("Format email tidak valid"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});
export type OfficerLoginRequest = z.infer<typeof officerLoginSchema>;

// 4. Officer Login Response Schema
export const officerLoginResponseSchema = z.object({
  data: z.object({
    token: z.string(),
    user: meSchema,
  }),
});
export type OfficerLoginResponse = z.infer<typeof officerLoginResponseSchema>;

// 5. Bootstrap Request Schema (B/H.1.0 - Strict Email NIM Extraction)
export const bootstrapRequestSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(1, "Nama lengkap tidak boleh kosong")
      .max(120, "Nama lengkap maksimal 120 karakter"),
  })
  .strict();
export type BootstrapRequest = z.infer<typeof bootstrapRequestSchema>;

// 6. Student Login Request Schema
export const studentLoginSchema = z.object({
  email: z.string().trim().email("Format email tidak valid"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});
export type StudentLoginRequest = z.infer<typeof studentLoginSchema>;

// 7. Student Register Request OTP Schema (v1.4.0)
export const studentRegisterRequestOtpSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, "Nama lengkap minimal 2 karakter")
      .max(120, "Nama lengkap maksimal 120 karakter"),
    email: z.string().trim().email("Format email tidak valid"),
    password: z.string().min(8, "Kata sandi minimal 8 karakter"),
  })
  .strict();
export type StudentRegisterRequestOtpRequest = z.infer<typeof studentRegisterRequestOtpSchema>;

// 8. Student Register Request Schema (v1.4.0 - Stateful Signed OTP)
export const studentRegisterSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, "Nama lengkap minimal 2 karakter")
      .max(120, "Nama lengkap maksimal 120 karakter"),
    email: z.string().trim().email("Format email tidak valid"),
    password: z.string().min(8, "Kata sandi minimal 8 karakter"),
    otp: z.string().trim().regex(/^\d{6}$/, "Kode OTP harus tepat 6 angka"),
    challenge_token: z.string().min(20, "Token tantangan OTP tidak valid"),
  })
  .strict();
export type StudentRegisterRequest = z.infer<typeof studentRegisterSchema>;

// 8. Forgot Password Request Schema
export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Format email tidak valid"),
});
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordSchema>;

// 9. Reset Password Request Schema
export const resetPasswordSchema = z.object({
  token: z.string().min(10, "Token pemulihan tidak valid"),
  new_password: z.string().min(8, "Kata sandi baru minimal 8 karakter"),
});
export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>;
