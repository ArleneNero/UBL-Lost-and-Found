import { describe, it, expect, vi } from "vitest";
import { randomUUID } from "crypto";
import { buildApp } from "../src/app.js";
import { parseEnv } from "../src/config/env.js";
import {
  resolvePhotoUrl,
  signStoragePath,
  validateStorageKey,
  verifyStorageSignature,
} from "../src/utils/photoResolver.js";
import { R2StorageProvider, r2Provider } from "../src/modules/uploads/storage/r2.provider.js";
import {
  validateImageMagicBytes,
  validateIntentForFinalize,
  validateObjectMetadata,
} from "../src/modules/uploads/upload.validator.js";
import { IntentRegistry } from "../src/modules/uploads/intent.registry.js";
import { UploadTokenService } from "../src/modules/uploads/token.service.js";
import { MAX_UPLOAD_SIZE_BYTES } from "../src/modules/uploads/uploads.dto.js";
import type { AuthUser } from "../src/modules/auth/auth.types.js";

const MOCK_USER: AuthUser = {
  userId: randomUUID(),
  authUserId: "test-sec-user",
  fullName: "Tester",
  email: "tester@budiluhur.ac.id",
  studentNumber: null,
  role: "OFFICER",
};

describe("Uploads, Storage & Infra Security Regression Suite (DB-free unit)", () => {
  it("FIND-01: parseEnv fails fast in production/development when DB or R2 vars are missing", () => {
    expect(() =>
      parseEnv({ NODE_ENV: "production" } as NodeJS.ProcessEnv)
    ).toThrow(/Missing or invalid required environment variables/);

    expect(() =>
      parseEnv({ NODE_ENV: "development" } as NodeJS.ProcessEnv)
    ).toThrow(/Missing or invalid required environment variables/);

    const testEnv = parseEnv({ NODE_ENV: "test" } as NodeJS.ProcessEnv);
    expect(testEnv.DATABASE_URL).toContain("localhost");
    expect(testEnv.CLOUDFLARE_ACCOUNT_ID).toBe("");
    expect(testEnv.R2_ACCESS_KEY_ID).toBe("");
    expect(testEnv.R2_SECRET_ACCESS_KEY).toBe("");
  });

  it("FIND-02: R2StorageProvider has no simulatePut method", () => {
    const provider = new R2StorageProvider();
    expect("simulatePut" in provider).toBe(false);
  });

  it("FIND-03 & FIND-05: validates storage keys, signs URLs, and rejects traversal/XSS", async () => {
    expect(validateStorageKey("items/kunci-motor.png")).toBe("items/kunci-motor.png");
    expect(validateStorageKey("submissions/abc-123.webp")).toBe("submissions/abc-123.webp");
    expect(validateStorageKey("posts/pos-pengajaran-cover.webp")).toBe("posts/pos-pengajaran-cover.webp");
    expect(validateStorageKey("items/../../package.json")).toBeNull();
    expect(validateStorageKey("items/..%2fpackage.json")).toBeNull();
    expect(validateStorageKey("items\\kunci.png")).toBeNull();
    expect(validateStorageKey("/items/kunci.png")).toBeNull();
    expect(validateStorageKey("items/bad\0.png")).toBeNull();

    const resolved = resolvePhotoUrl("items/kunci-motor.png", 120);
    const parsed = new URL(resolved.url);
    const exp = parsed.searchParams.get("exp") ?? undefined;
    const sig = parsed.searchParams.get("sig") ?? undefined;
    expect(exp).toBeDefined();
    expect(sig).toBeDefined();
    expect(verifyStorageSignature("items/kunci-motor.png", exp, sig)).toEqual({ valid: true });
    expect(verifyStorageSignature("items/kunci-motor.png", exp, "tampered-sig")).toEqual({
      valid: false,
      reason: "INVALID_SIGNATURE",
    });

    const app = buildApp();
    await app.ready();
    try {
      const futureExp = Math.floor(Date.now() / 1000) + 120;

      // Traversal blocked before filesystem access
      const travRes = await app.inject({
        method: "GET",
        url: `/storage/items/..%2f..%2fpackage.json?exp=${futureExp}&sig=invalid`,
      });
      expect(travRes.statusCode).toBe(400);

      // Unsigned request rejected with 403
      const unsignedRes = await app.inject({
        method: "GET",
        url: "/storage/items/kunci-motor.png",
      });
      expect(unsignedRes.statusCode).toBe(403);

      // Expired signature rejected with 403
      const expiredExp = Math.floor(Date.now() / 1000) - 60;
      const expiredSig = signStoragePath("items/kunci-motor.png", expiredExp);
      const expiredRes = await app.inject({
        method: "GET",
        url: `/storage/items/kunci-motor.png?exp=${expiredExp}&sig=${expiredSig}`,
      });
      expect(expiredRes.statusCode).toBe(403);
      expect(expiredRes.json().error.code).toBe("STORAGE_URL_EXPIRED");

      // Non-raster SVG extension rejected (415 or 404 if not present; test signature for .svg)
      const svgSig = signStoragePath("items/xss.svg", futureExp);
      const svgRes = await app.inject({
        method: "GET",
        url: `/storage/items/xss.svg?exp=${futureExp}&sig=${svgSig}`,
      });
      expect([404, 415]).toContain(svgRes.statusCode);

      // Valid signed request for existing seeded file returns raster MIME + nosniff + CSP headers
      const validSig = signStoragePath("items/kunci-motor.png", futureExp);
      const okRes = await app.inject({
        method: "GET",
        url: `/storage/items/kunci-motor.png?exp=${futureExp}&sig=${validSig}`,
      });
      expect(okRes.statusCode).toBe(200);
      expect(okRes.headers["content-type"]).toBe("image/png");
      expect(okRes.headers["x-content-type-options"]).toBe("nosniff");
      expect(okRes.headers["content-security-policy"]).toBe("default-src 'none'");
    } finally {
      await app.close();
    }
  });

  it("FIND-07: enforces explicit CORS allowlist and omits PNA header in production", async () => {
    const app = buildApp();
    await app.ready();
    try {
      const allowedRes = await app.inject({
        method: "OPTIONS",
        url: "/api/v1/health",
        headers: {
          origin: "http://localhost:5173",
          "access-control-request-method": "GET",
        },
      });
      expect(allowedRes.headers["access-control-allow-origin"]).toBe("http://localhost:5173");

      const evilRes = await app.inject({
        method: "GET",
        url: "/api/v1/health",
        headers: {
          origin: "https://evil.example.com",
        },
      });
      expect(evilRes.headers["access-control-allow-origin"]).toBeUndefined();
    } finally {
      await app.close();
    }
  });

  it("FIND-08 & FIND-09: IntentRegistry markFinalized and UploadTokenService verifyAndConsume are atomic", async () => {
    const registry = new IntentRegistry({ useInMemory: true });
    const uploadId = randomUUID();
    await registry.save({
      uploadId,
      userId: MOCK_USER.userId,
      purpose: "ITEM_PHOTO",
      storagePath: `items/${uploadId}.jpg`,
      contentType: "image/jpeg",
      sizeBytes: 1024,
      expiresAt: Date.now() + 60_000,
    });

    const firstFinalize = await registry.markFinalized(uploadId, MOCK_USER.userId);
    expect(firstFinalize?.finalizedAt).toBeTypeOf("number");
    const secondFinalize = await registry.markFinalized(uploadId, MOCK_USER.userId);
    expect(secondFinalize).toBeNull();

    const fetched = await registry.get(uploadId);
    expect(() => validateIntentForFinalize(fetched, MOCK_USER)).toThrow(/sudah pernah difinalisasi/i);

    const tokenSvc = new UploadTokenService({ useInMemory: true });
    const { uploadToken } = tokenSvc.issueUploadToken(
      MOCK_USER.userId,
      "ITEM_PHOTO",
      `items/${uploadId}.jpg`,
      300
    );
    const consumed = await tokenSvc.verifyAndConsume(uploadToken, "ITEM_PHOTO", MOCK_USER.userId);
    expect(consumed.storagePath).toBe(`items/${uploadId}.jpg`);

    await expect(
      tokenSvc.verifyAndConsume(uploadToken, "ITEM_PHOTO", MOCK_USER.userId)
    ).rejects.toThrow(/anti-replay/i);
  });

  it("FIND-18: validates metadata contentType and JPEG/PNG/WebP magic bytes", () => {
    const intent = {
      uploadId: randomUUID(),
      userId: MOCK_USER.userId,
      purpose: "ITEM_PHOTO" as const,
      storagePath: "items/sample.jpg",
      contentType: "image/jpeg" as const,
      sizeBytes: 1024,
      expiresAt: Date.now() + 60_000,
    };

    expect(() =>
      validateObjectMetadata(
        { exists: true, contentLength: 500, contentType: "image/svg+xml" },
        intent
      )
    ).toThrow(/tidak sesuai dengan intent/i);

    // Valid JPEG, PNG, WebP headers
    expect(() =>
      validateImageMagicBytes(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]), "image/jpeg")
    ).not.toThrow();
    expect(() =>
      validateImageMagicBytes(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "image/png")
    ).not.toThrow();
    expect(() =>
      validateImageMagicBytes(Buffer.from("RIFF\x24\x00\x00\x00WEBPVP8 "), "image/webp")
    ).not.toThrow();

    // Forged HTML/SVG payload claiming image/jpeg
    expect(() =>
      validateImageMagicBytes(Buffer.from("<svg onload=alert(1)>"), "image/jpeg")
    ).toThrow(/Konten biner file tidak sesuai/i);
  });

  it("FIND-16 & FIND-19: rate limits sensitive endpoints with 429 and enforces 5 MiB bodyLimit config", async () => {
    expect(MAX_UPLOAD_SIZE_BYTES).toBe(5 * 1024 * 1024);

    const app = buildApp({ enableRateLimit: true, useInMemoryRateLimit: true });
    await app.ready();
    try {
      // Unauthenticated hits to /api/v1/uploads/intents trigger 401 up to 30 reqs, then 429
      for (let i = 0; i < 30; i++) {
        const res = await app.inject({
          method: "POST",
          url: "/api/v1/uploads/intents",
          payload: {},
        });
        expect(res.statusCode).toBe(401);
      }

      const blockedRes = await app.inject({
        method: "POST",
        url: "/api/v1/uploads/intents",
        payload: {},
      });
      expect(blockedRes.statusCode).toBe(429);
      expect(blockedRes.json().error.code).toBe("RATE_LIMIT_EXCEEDED");

      // Non-sensitive endpoint (/health) remains unaffected
      const healthRes = await app.inject({ method: "GET", url: "/health" });
      expect(healthRes.statusCode).toBe(200);
    } finally {
      await app.close();
    }
  });

  it("FIND-19: PUT /uploads/:upload_id/content allows > 1 MiB and enforces 5 MiB bodyLimit", async () => {
    const app = buildApp({ enableRateLimit: false });
    await app.ready();
    try {
      const over1MibRes = await app.inject({
        method: "PUT",
        url: "/api/v1/uploads/00000000-0000-4000-8000-000000000001/content",
        headers: { "content-type": "image/jpeg" },
        payload: Buffer.alloc(1.5 * 1024 * 1024, 0xff),
      });
      expect(over1MibRes.statusCode).toBe(401);

      const over5MibRes = await app.inject({
        method: "PUT",
        url: "/api/v1/uploads/00000000-0000-4000-8000-000000000001/content",
        headers: { "content-type": "image/jpeg" },
        payload: Buffer.alloc(MAX_UPLOAD_SIZE_BYTES + 1, 0xff),
      });
      expect(over5MibRes.statusCode).toBe(413);
    } finally {
      await app.close();
    }
  });

  it("FIND-03 & FIND-07: disables /storage/* local fallback and PNA header in production", async () => {
    const prevNodeEnv = process.env.NODE_ENV;
    const prevAuthSecret = process.env.AUTH_SECRET;
    process.env.NODE_ENV = "production";
    process.env.AUTH_SECRET = "prod-secret-minimum-32-characters-long-12345";
    vi.spyOn(r2Provider, "getObjectStream").mockResolvedValue(null);

    const app = buildApp({ enableRateLimit: false });
    await app.ready();
    try {
      const futureExp = Math.floor(Date.now() / 1000) + 120;
      const validSig = signStoragePath("items/kunci-motor.png", futureExp);
      const storageRes = await app.inject({
        method: "GET",
        url: `/storage/items/kunci-motor.png?exp=${futureExp}&sig=${validSig}`,
      });
      expect(storageRes.statusCode).toBe(404);
      expect(storageRes.headers["access-control-allow-private-network"]).toBeUndefined();

      const corsEvilRes = await app.inject({
        method: "OPTIONS",
        url: "/api/v1/health",
        headers: {
          origin: "http://localhost:5173",
          "access-control-request-method": "GET",
        },
      });
      expect(corsEvilRes.headers["access-control-allow-origin"]).toBeUndefined();
    } finally {
      await app.close();
      vi.restoreAllMocks();
      if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = prevNodeEnv;
      if (prevAuthSecret === undefined) delete process.env.AUTH_SECRET;
      else process.env.AUTH_SECRET = prevAuthSecret;
    }
  });
});
