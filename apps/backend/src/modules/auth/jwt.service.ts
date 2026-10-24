import crypto from "crypto";
import { env } from "../../config/env.js";
import { TokenPayload } from "./auth.types.js";

export class JwtService {
  /**
   * Helper to sign a deterministic JWT with HMAC-SHA256 (HS256).
   */
  createToken(
    payload: { sub: string; email?: string; name?: string },
    expiresInSeconds: number = 3600
  ): string {
    const now = Math.floor(Date.now() / 1000);
    const fullPayload: TokenPayload = {
      ...payload,
      iat: now,
      exp: now + expiresInSeconds,
      iss: "ubl-lostnfound-auth",
    };

    const header = { alg: "HS256", typ: "JWT" };
    const headerB64 = Buffer.from(JSON.stringify(header)).toString("base64url");
    const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
    const signature = crypto
      .createHmac("sha256", env.AUTH_SECRET)
      .update(`${headerB64}.${payloadB64}`)
      .digest("base64url");

    return `${headerB64}.${payloadB64}.${signature}`;
  }

  /**
   * Verifies a Bearer JWT signature, structure, and expiration safely against timing attacks.
   * Returns TokenPayload if valid, or null if tampered, expired, or malformed.
   */
  verifyToken(token: string): TokenPayload | null {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) {
        return null;
      }

      const [headerB64, payloadB64, signatureB64] = parts;
      const expectedSignature = crypto
        .createHmac("sha256", env.AUTH_SECRET)
        .update(`${headerB64}.${payloadB64}`)
        .digest("base64url");

      const sigBuf = Buffer.from(signatureB64);
      const expectedBuf = Buffer.from(expectedSignature);

      if (sigBuf.length !== expectedBuf.length) {
        return null;
      }

      if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) {
        return null;
      }

      const payloadStr = Buffer.from(payloadB64, "base64url").toString("utf-8");
      const payload: TokenPayload = JSON.parse(payloadStr);

      if (!payload.sub) {
        return null;
      }

      // Check expiration
      if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }
}

export const jwtService = new JwtService();
