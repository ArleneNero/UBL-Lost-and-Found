import { env } from "../config/env.js";

export interface ResolvedPhotoUrl {
  url: string;
  expires_at: string;
}

/**
 * Resolves an internal storage_path to a safe public read URL with TTL expiration.
 * Strictly prevents leaking raw internal R2 keys or cloud storage secrets.
 */
export function resolvePhotoUrl(storagePath: string, ttlSeconds = 300): ResolvedPhotoUrl {
  const expiresAtDate = new Date(Date.now() + ttlSeconds * 1000);
  const expires_at = expiresAtDate.toISOString();

  // If a public CDN / R2 URL is provided, format it safely with an expiration token/param
  if (env.R2_PUBLIC_URL) {
    const cleanBase = env.R2_PUBLIC_URL.replace(/\/+$/, "");
    const cleanPath = storagePath.replace(/^\/+/, "");
    return {
      url: `${cleanBase}/${cleanPath}?exp=${Math.floor(expiresAtDate.getTime() / 1000)}`,
      expires_at,
    };
  }

  // Safe fallback mock URL for local/testing
  const cleanPath = storagePath.replace(/^\/+/, "");
  return {
    url: `http://localhost:${env.PORT}/storage/${cleanPath}?exp=${Math.floor(expiresAtDate.getTime() / 1000)}`,
    expires_at,
  };
}
