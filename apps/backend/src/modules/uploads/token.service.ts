import { randomUUID } from "crypto";
import { tokenSigner } from "./token.signer.js";
import type { UploadPurpose } from "./uploads.dto.js";

export interface UploadTokenPayload {
  tokenId: string;
  userId: string;
  purpose: UploadPurpose;
  storagePath: string;
  exp: number; // epoch in seconds
}

export class UploadTokenService {
  private consumedTokens = new Set<string>();

  public issueUploadToken(
    userId: string,
    purpose: UploadPurpose,
    storagePath: string,
    expiresInSeconds = 900
  ): { uploadToken: string; expiresAt: Date } {
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    const tokenId = randomUUID();

    const payload: UploadTokenPayload = {
      tokenId,
      userId,
      purpose,
      storagePath,
      exp: Math.floor(expiresAt.getTime() / 1000),
    };

    return {
      uploadToken: tokenSigner.sign(payload),
      expiresAt,
    };
  }

  public verifyAndConsume(
    uploadToken: string,
    expectedPurpose: UploadPurpose,
    expectedUserId: string
  ): { storagePath: string } {
    const payload = tokenSigner.verify<UploadTokenPayload>(uploadToken);
    if (!payload) {
      const err = new Error("Upload token tidak valid atau tanda tangan rusak");
      (err as any).statusCode = 422;
      (err as any).code = "INVALID_TOKEN";
      throw err;
    }

    if (payload.exp * 1000 < Date.now()) {
      const err = new Error("Upload token telah kedaluwarsa (15 menit)");
      (err as any).statusCode = 422;
      (err as any).code = "TOKEN_EXPIRED";
      throw err;
    }

    if (payload.purpose !== expectedPurpose) {
      const err = new Error(
        `Tujuan token tidak sesuai (diharapkan: ${expectedPurpose}, aktual: ${payload.purpose})`
      );
      (err as any).statusCode = 422;
      (err as any).code = "INVALID_PURPOSE";
      throw err;
    }

    if (payload.userId !== expectedUserId) {
      const err = new Error("Upload token bukan milik akun yang sedang login");
      (err as any).statusCode = 403;
      (err as any).code = "FORBIDDEN";
      throw err;
    }

    if (this.consumedTokens.has(payload.tokenId)) {
      const err = new Error("Upload token sudah pernah digunakan (anti-replay)");
      (err as any).statusCode = 409;
      (err as any).code = "TOKEN_ALREADY_USED";
      throw err;
    }

    this.consumedTokens.add(payload.tokenId);
    return { storagePath: payload.storagePath };
  }

  public clear(): void {
    this.consumedTokens.clear();
  }
}

export const uploadTokenService = new UploadTokenService();
