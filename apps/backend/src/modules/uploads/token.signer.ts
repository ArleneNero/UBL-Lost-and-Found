import { createHmac, timingSafeEqual } from "crypto";
import { env } from "../../config/env.js";

export class TokenSigner {
  public sign(payload: object): string {
    const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const sig = createHmac("sha256", env.AUTH_SECRET)
      .update(data)
      .digest("base64url");
    return `${data}.${sig}`;
  }

  public verify<T>(token: string): T | null {
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [data, sig] = parts;
    const expectedSig = createHmac("sha256", env.AUTH_SECRET)
      .update(data)
      .digest("base64url");

    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expBuf)) return null;

    try {
      return JSON.parse(Buffer.from(data, "base64url").toString("utf-8")) as T;
    } catch {
      return null;
    }
  }
}

export const tokenSigner = new TokenSigner();
