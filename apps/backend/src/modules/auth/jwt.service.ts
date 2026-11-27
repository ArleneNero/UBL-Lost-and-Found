import crypto from "crypto";
import { resolveRuntimeAuthSecret } from "../../config/env.js";
import { TokenPayload } from "./auth.types.js";

export const JWT_ISSUER = "ubl-lostnfound-auth";
const EXPECTED_JWT_ALG = "HS256";
const EXPECTED_JWT_TYP = "JWT";

export interface CreateTokenPayload {
  sub: string;
  email?: string;
  name?: string;
  purpose?: string;
  jti?: string;
}

export class JwtService {
  /**
   * Helper to sign a deterministic JWT with HMAC-SHA256 (HS256).
   */
  createToken(
    payload: CreateTokenPayload,
    expiresInSeconds: number = 2 * 3600 // 2 hours (7,200 seconds)
  ): string {
    const secret = resolveRuntimeAuthSecret();
    const now = Math.floor(Date.now() / 1000);
    const fullPayload: TokenPayload = {
      sub: payload.sub,
      ...(payload.email !== undefined ? { email: payload.email } : {}),
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.purpose !== undefined ? { purpose: payload.purpose } : {}),
      ...(payload.jti !== undefined ? { jti: payload.jti } : {}),
      iat: now,
      exp: now + expiresInSeconds,
      iss: JWT_ISSUER,
    };

    const header = { alg: EXPECTED_JWT_ALG, typ: EXPECTED_JWT_TYP };
    const headerB64 = Buffer.from(JSON.stringify(header)).toString("base64url");
    const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
    const signature = crypto
      .createHmac("sha256", secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest("base64url");

    return `${headerB64}.${payloadB64}.${signature}`;
  }

  /**
   * Verifies a Bearer JWT header (alg/typ), HMAC-SHA256 signature, issuer, and required expiration.
   * Propagates 503 SERVER_MISCONFIGURED from resolveRuntimeAuthSecret() outside try/catch.
   */
  verifyToken(token: string): TokenPayload | null {
    const secret = resolveRuntimeAuthSecret();
    try {
      if (typeof token !== "string" || token.length === 0) {
        return null;
      }

      const parts = token.split(".");
      if (parts.length !== 3) {
        return null;
      }

      const [headerB64, payloadB64, signatureB64] = parts;
      if (!headerB64 || !payloadB64 || !signatureB64) {
        return null;
      }

      const headerStr = Buffer.from(headerB64, "base64url").toString("utf-8");
      const header = JSON.parse(headerStr) as Record<string, unknown>;
      if (
        !header ||
        typeof header !== "object" ||
        Array.isArray(header) ||
        header.alg !== EXPECTED_JWT_ALG ||
        header.typ !== EXPECTED_JWT_TYP
      ) {
        return null;
      }

      const expectedSignature = crypto
        .createHmac("sha256", secret)
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
      const payload = JSON.parse(payloadStr) as TokenPayload;

      if (
        !payload ||
        typeof payload !== "object" ||
        Array.isArray(payload) ||
        typeof payload.sub !== "string" ||
        !payload.sub
      ) {
        return null;
      }

      if (payload.iss !== JWT_ISSUER) {
        return null;
      }

      if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) {
        return null;
      }

      if (Math.floor(Date.now() / 1000) > payload.exp) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }
}

export const jwtService = new JwtService();
