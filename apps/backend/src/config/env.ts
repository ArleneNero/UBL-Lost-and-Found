import crypto from "crypto";
import { z } from "zod";
import * as dotenv from "dotenv";
import { AppError } from "../utils/errors.js";

dotenv.config();

const DEFAULT_DATABASE_URL =
  "postgresql://neondb_owner:npg_PIJp8m3YwdaU@ep-fragrant-glade-a1oh9lfk-pooler.ap-southeast-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";

const DEFAULT_DATABASE_URL_UNPOOLED =
  "postgresql://neondb_owner:npg_PIJp8m3YwdaU@ep-fragrant-glade-a1oh9lfk.ap-southeast-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  FRONTEND_ORIGIN: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().default(process.env.DATABASE_URL || DEFAULT_DATABASE_URL),
  DATABASE_URL_UNPOOLED: z
    .string()
    .default(process.env.DATABASE_URL_UNPOOLED || DEFAULT_DATABASE_URL_UNPOOLED),
  R2_BUCKET_NAME: z.string().default("lostandfound-budiluhur"),
  CLOUDFLARE_ACCOUNT_ID: z
    .string()
    .default(process.env.CLOUDFLARE_ACCOUNT_ID || "2a552cb6962e6b3a4309ea71b7c30fd4"),
  R2_ACCESS_KEY_ID: z
    .string()
    .default(process.env.R2_ACCESS_KEY_ID || "d291304a9f9f6dbc0890860d51f3e0e0"),
  R2_SECRET_ACCESS_KEY: z
    .string()
    .default(
      process.env.R2_SECRET_ACCESS_KEY ||
        "617f1047a65522e8ed1472d1830d0f7a7c6ad2e151fc2f1a9d7febd20d6e1586"
    ),
  R2_PUBLIC_URL: z
    .string()
    .default(
      process.env.R2_PUBLIC_URL || "https://pub-ec2de406cfec4d6ba5d9a2beb58f023a.r2.dev"
    ),
  AUTH_SECRET: z
    .string()
    .optional()
    .transform((v) => (v || "").trim()),
  NEON_AUTH_BASE_URL: z.string().optional(),
  RESEND_API_KEY: z
    .string()
    .default(process.env.RESEND_API_KEY || ""),
  RESEND_FROM_EMAIL: z
    .string()
    .default(
      process.env.RESEND_FROM_EMAIL ||
        "UBL LostnFound <noreply@lostandfound-budiluhur.web.id>"
    ),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(
    `Invalid environment configuration: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`
  );
}

export const env = parsed.data;

let ephemeralDevSecret: string | null = null;
let hasLoggedEphemeralWarning = false;

/**
 * Resolves the active HMAC signing secret without ever falling back to hardcoded static literals.
 * - Production: throws 503 SERVER_MISCONFIGURED if AUTH_SECRET is missing, < 32 chars, or a known placeholder.
 * - Development / Test: generates a process-local random 256-bit ephemeral secret with a one-time warning.
 */
export function resolveRuntimeAuthSecret(): string {
  const configured = (process.env.AUTH_SECRET ?? "").trim();
  const isPlaceholder = /^(dev-neon-auth-secret|changeme|placeholder|default-secret)/i.test(
    configured
  );

  if (configured.length >= 32 && !isPlaceholder) {
    return configured;
  }

  const runtimeNodeEnv = (process.env.NODE_ENV || env.NODE_ENV || "").trim();
  if (runtimeNodeEnv === "production") {
    throw new AppError(
      "SERVER_MISCONFIGURED",
      "Konfigurasi keamanan server (AUTH_SECRET) belum diatur.",
      503
    );
  }

  if (!ephemeralDevSecret) {
    ephemeralDevSecret = crypto.randomBytes(32).toString("hex");
  }

  if (!hasLoggedEphemeralWarning) {
    hasLoggedEphemeralWarning = true;
    console.warn(
      "WARNING: AUTH_SECRET is missing or insecure (< 32 chars). Using an ephemeral random secret for non-production runtime."
    );
  }

  return ephemeralDevSecret;
}

