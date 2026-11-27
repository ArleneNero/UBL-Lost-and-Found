import crypto from "crypto";
import { z } from "zod";
import * as dotenv from "dotenv";
import { AppError } from "../utils/errors.js";

dotenv.config();

export const TEST_FALLBACK_DATABASE_URL =
  "postgresql://test:test@localhost:5432/lostfound_test";

const rawEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  FRONTEND_ORIGIN: z
    .string()
    .optional()
    .transform((v) => (v || "").trim()),
  PUBLIC_APP_URL: z
    .string()
    .optional()
    .transform((v) => (v || "").trim()),
  DATABASE_URL: z
    .string()
    .optional()
    .transform((v) => (v || "").trim()),
  DATABASE_URL_UNPOOLED: z
    .string()
    .optional()
    .transform((v) => (v || "").trim()),
  R2_BUCKET_NAME: z
    .string()
    .optional()
    .transform((v) => (v || "").trim() || "lostandfound-budiluhur"),
  CLOUDFLARE_ACCOUNT_ID: z
    .string()
    .optional()
    .transform((v) => (v || "").trim()),
  R2_ACCESS_KEY_ID: z
    .string()
    .optional()
    .transform((v) => (v || "").trim()),
  R2_SECRET_ACCESS_KEY: z
    .string()
    .optional()
    .transform((v) => (v || "").trim()),
  R2_PUBLIC_URL: z
    .string()
    .optional()
    .transform((v) => (v || "").trim()),
  AUTH_SECRET: z
    .string()
    .optional()
    .transform((v) => (v || "").trim()),
  STORAGE_SIGNING_SECRET: z
    .string()
    .optional()
    .transform((v) => (v || "").trim()),
  NEON_AUTH_BASE_URL: z.string().optional(),
  RESEND_API_KEY: z
    .string()
    .optional()
    .transform((v) => (v || "").trim()),
  RESEND_FROM_EMAIL: z
    .string()
    .optional()
    .transform(
      (v) => (v || "").trim() || "UBL LostnFound <noreply@lostandfound-budiluhur.web.id>"
    ),
});

export interface AppEnv {
  NODE_ENV: "development" | "test" | "production";
  PORT: number;
  FRONTEND_ORIGIN: string;
  PUBLIC_APP_URL: string;
  DATABASE_URL: string;
  DATABASE_URL_UNPOOLED: string;
  R2_BUCKET_NAME: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_PUBLIC_URL: string;
  AUTH_SECRET: string;
  STORAGE_SIGNING_SECRET: string;
  NEON_AUTH_BASE_URL?: string;
  RESEND_API_KEY: string;
  RESEND_FROM_EMAIL: string;
}

const PLACEHOLDER_SECRET_REGEX =
  /^(dev-neon-auth-secret|changeme|placeholder|default-secret)/i;

/**
 * Checks whether a database URL is the non-routable local placeholder used in DB-less unit tests.
 */
export function isMockTestDatabaseUrl(url: string): boolean {
  return url === TEST_FALLBACK_DATABASE_URL;
}

/**
 * Validates and resolves environment configuration.
 * - In NODE_ENV=test: allows safe non-routable DB/storage placeholders when .env is absent.
 * - In development/production: fails fast if mandatory DB or R2 variables are missing.
 */
export function parseEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const parsed = rawEnvSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(
      `Invalid environment configuration: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`
    );
  }

  const raw = parsed.data;
  const defaultFrontendOrigin =
    raw.NODE_ENV === "production"
      ? "https://lostandfound-budiluhur.web.id"
      : "http://localhost:5173";
  const resolvedFrontendOrigin = raw.FRONTEND_ORIGIN || defaultFrontendOrigin;

  if (raw.NODE_ENV === "test") {
    const dbUrl = raw.DATABASE_URL || TEST_FALLBACK_DATABASE_URL;
    return {
      ...raw,
      FRONTEND_ORIGIN: resolvedFrontendOrigin,
      DATABASE_URL: dbUrl,
      DATABASE_URL_UNPOOLED: raw.DATABASE_URL_UNPOOLED || dbUrl,
    };
  }

  const missing: string[] = [];
  if (!raw.DATABASE_URL) missing.push("DATABASE_URL");
  if (!raw.DATABASE_URL_UNPOOLED) missing.push("DATABASE_URL_UNPOOLED");
  if (!raw.CLOUDFLARE_ACCOUNT_ID) missing.push("CLOUDFLARE_ACCOUNT_ID");
  if (!raw.R2_ACCESS_KEY_ID) missing.push("R2_ACCESS_KEY_ID");
  if (!raw.R2_SECRET_ACCESS_KEY) missing.push("R2_SECRET_ACCESS_KEY");

  if (raw.NODE_ENV === "production") {
    if (raw.AUTH_SECRET.length < 32 || PLACEHOLDER_SECRET_REGEX.test(raw.AUTH_SECRET)) {
      missing.push("AUTH_SECRET (>= 32 random chars)");
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing or invalid required environment variables for NODE_ENV=${raw.NODE_ENV}: ${missing.join(", ")}`
    );
  }

  return {
    ...raw,
    FRONTEND_ORIGIN: resolvedFrontendOrigin,
  };
}

export const env: AppEnv = parseEnv();

let ephemeralDevSecret: string | null = null;
let hasLoggedEphemeralWarning = false;

/**
 * Resolves the active HMAC signing secret without ever falling back to hardcoded static literals.
 * - Production: throws 503 SERVER_MISCONFIGURED if AUTH_SECRET is missing, < 32 chars, or a known placeholder.
 * - Development / Test: generates a process-local random 256-bit ephemeral secret with a one-time warning.
 */
export function resolveRuntimeAuthSecret(): string {
  const configured = (process.env.AUTH_SECRET ?? "").trim();
  const isPlaceholder = PLACEHOLDER_SECRET_REGEX.test(configured);

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

/**
 * Resolves the HMAC secret dedicated to signing `/storage/*` media access URLs.
 * Uses STORAGE_SIGNING_SECRET when provided (>= 32 chars), or derives a domain-separated key
 * from resolveRuntimeAuthSecret() so production never falls back to a static literal.
 */
export function getStorageSigningSecret(): string {
  const dedicated = (process.env.STORAGE_SIGNING_SECRET ?? "").trim();
  if (dedicated.length >= 32 && !PLACEHOLDER_SECRET_REGEX.test(dedicated)) {
    return dedicated;
  }

  return crypto
    .createHmac("sha256", resolveRuntimeAuthSecret())
    .update("ubl-storage-signing-v1")
    .digest("hex");
}
