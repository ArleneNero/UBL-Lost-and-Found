import crypto from "crypto";
import { env, getStorageSigningSecret } from "../config/env.js";

export interface ResolvedPhotoUrl {
  url: string;
  expires_at: string;
}

export const STORAGE_KEY_REGEX = /^(items|submissions|posts)\/[a-zA-Z0-9._-]+$/;

export const ALLOWED_RASTER_MIME_TYPES = new Set<string>([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

/**
 * Validates that a `/storage/*` key matches an allowed media prefix and contains no path traversal.
 */
export function validateStorageKey(rawKey: string): string | null {
  if (!rawKey) return null;
  if (
    rawKey.includes("\0") ||
    rawKey.includes("\\") ||
    rawKey.includes("..") ||
    rawKey.startsWith("/")
  ) {
    return null;
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(rawKey);
  } catch {
    return null;
  }

  if (
    decoded !== rawKey ||
    decoded.includes("\0") ||
    decoded.includes("\\") ||
    decoded.includes("..") ||
    decoded.startsWith("/")
  ) {
    return null;
  }

  if (!STORAGE_KEY_REGEX.test(decoded)) {
    return null;
  }

  return decoded;
}

/**
 * Generates an HMAC-SHA256 signature binding a storage key to its Unix expiration timestamp.
 */
export function signStoragePath(cleanPath: string, expUnixSeconds: number): string {
  const secret = getStorageSigningSecret();
  return crypto
    .createHmac("sha256", secret)
    .update(`${cleanPath}:${expUnixSeconds}`)
    .digest("base64url");
}

/**
 * Verifies a signed `/storage/*` request against expiration and constant-time HMAC equality.
 */
export function verifyStorageSignature(
  cleanPath: string,
  expParam: string | undefined,
  sigParam: string | undefined
): { valid: true } | { valid: false; reason: "EXPIRED" | "INVALID_SIGNATURE" } {
  if (!expParam || !sigParam || !/^\d+$/.test(expParam)) {
    return { valid: false, reason: "INVALID_SIGNATURE" };
  }

  const expUnixSeconds = Number(expParam);
  if (!Number.isSafeInteger(expUnixSeconds) || expUnixSeconds <= 0) {
    return { valid: false, reason: "INVALID_SIGNATURE" };
  }

  const expectedSig = signStoragePath(cleanPath, expUnixSeconds);
  const sigBuf = Buffer.from(sigParam);
  const expectedBuf = Buffer.from(expectedSig);

  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return { valid: false, reason: "INVALID_SIGNATURE" };
  }

  if (expUnixSeconds < Math.floor(Date.now() / 1000)) {
    return { valid: false, reason: "EXPIRED" };
  }

  return { valid: true };
}

/**
 * Resolves an internal storage_path to a safe public read URL with TTL expiration and HMAC signature.
 * Strictly prevents leaking raw internal R2 keys or cloud storage secrets.
 */
export function resolvePhotoUrl(storagePath: string, ttlSeconds = 300): ResolvedPhotoUrl {
  const expiresAtDate = new Date(Date.now() + ttlSeconds * 1000);
  const expires_at = expiresAtDate.toISOString();
  const expUnixSeconds = Math.floor(expiresAtDate.getTime() / 1000);
  const cleanPath = storagePath.replace(/^\/+/, "");

  // If a public CDN / custom domain R2 URL is provided, format it safely with an expiration token/param.
  // Note: *.r2.dev is commonly DNS-intercepted by Indonesian ISPs; route those through signed /storage/*.
  if (env.R2_PUBLIC_URL && !env.R2_PUBLIC_URL.includes(".r2.dev")) {
    const cleanBase = env.R2_PUBLIC_URL.replace(/\/+$/, "");
    return {
      url: `${cleanBase}/${cleanPath}?exp=${expUnixSeconds}`,
      expires_at,
    };
  }

  const sig = signStoragePath(cleanPath, expUnixSeconds);
  const isLocalDev = env.NODE_ENV === "development" && !process.env.VERCEL;
  const baseUrl = isLocalDev
    ? `http://localhost:${env.PORT}`
    : (env.PUBLIC_APP_URL || process.env.PUBLIC_APP_URL || "https://lostandfound-budiluhur.web.id");

  return {
    url: `${baseUrl}/storage/${cleanPath}?exp=${expUnixSeconds}&sig=${sig}`,
    expires_at,
  };
}
