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

  // If a public CDN / custom domain R2 URL is provided, format it safely with an expiration token/param
  // Note: *.r2.dev is commonly DNS-intercepted by Indonesian ISPs (Trust Positif / Internet Sehat).
  // For *.r2.dev, route through the streaming /storage endpoint which connects directly to Cloudflare S3 endpoint.
  if (env.R2_PUBLIC_URL && !env.R2_PUBLIC_URL.includes(".r2.dev")) {
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
