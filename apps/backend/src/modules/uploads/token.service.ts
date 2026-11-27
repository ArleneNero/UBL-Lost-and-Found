import { randomUUID } from "crypto";
import { env, isMockTestDatabaseUrl } from "../../config/env.js";
import { db, type DbClient, type DbTransaction } from "../../db/index.js";
import { consumedUploadTokens } from "../../db/schema/uploads.js";
import { tokenSigner } from "./token.signer.js";
import type { UploadPurpose } from "./uploads.dto.js";
import { AppError } from "../../utils/errors.js";

export interface UploadTokenPayload {
  tokenId: string;
  userId: string;
  purpose: UploadPurpose;
  storagePath: string;
  exp: number; // epoch in seconds
}

export interface UploadTokenServiceOptions {
  useInMemory?: boolean;
}

/**
 * Signs and atomically consumes single-use upload tokens backed by PostgreSQL
 * `consumed_upload_tokens` (preventing cross-instance replay across serverless workers).
 */
export class UploadTokenService {
  private consumedTokens = new Set<string>();
  private readonly explicitInMemory?: boolean;

  constructor(options?: UploadTokenServiceOptions) {
    this.explicitInMemory = options?.useInMemory;
  }

  private get useInMemory(): boolean {
    if (this.explicitInMemory !== undefined) {
      return this.explicitInMemory;
    }
    return env.NODE_ENV === "test" && isMockTestDatabaseUrl(env.DATABASE_URL);
  }

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

  public async verifyAndConsume(
    uploadToken: string,
    expectedPurpose: UploadPurpose,
    expectedUserId: string,
    tx?: DbClient | DbTransaction
  ): Promise<{ storagePath: string }> {
    const payload = tokenSigner.verify<UploadTokenPayload>(uploadToken);
    if (!payload) {
      throw new AppError("INVALID_TOKEN", "Upload token tidak valid atau tanda tangan rusak", 422);
    }

    if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) {
      throw new AppError("TOKEN_EXPIRED", "Upload token telah kedaluwarsa (15 menit)", 422);
    }

    if (payload.purpose !== expectedPurpose) {
      throw new AppError(
        "INVALID_PURPOSE",
        `Tujuan token tidak sesuai (diharapkan: ${expectedPurpose}, aktual: ${payload.purpose})`,
        422
      );
    }

    if (payload.userId !== expectedUserId) {
      throw new AppError("FORBIDDEN", "Upload token bukan milik akun yang sedang login", 403);
    }

    if (!payload.tokenId || !payload.storagePath) {
      throw new AppError("INVALID_TOKEN", "Payload upload token tidak lengkap", 422);
    }

    if (this.useInMemory) {
      if (this.consumedTokens.has(payload.tokenId)) {
        throw new AppError(
          "TOKEN_ALREADY_USED",
          "Upload token sudah pernah digunakan (anti-replay)",
          409
        );
      }
      this.consumedTokens.add(payload.tokenId);
      return { storagePath: payload.storagePath };
    }

    const executor = tx ?? db;
    const inserted = await executor
      .insert(consumedUploadTokens)
      .values({
        tokenId: payload.tokenId,
        userId: expectedUserId,
        expiresAt: new Date(payload.exp * 1000),
      })
      .onConflictDoNothing({ target: consumedUploadTokens.tokenId })
      .returning({ tokenId: consumedUploadTokens.tokenId });

    if (inserted.length === 0) {
      throw new AppError(
        "TOKEN_ALREADY_USED",
        "Upload token sudah pernah digunakan (anti-replay)",
        409
      );
    }

    return { storagePath: payload.storagePath };
  }

  public clear(): void {
    this.consumedTokens.clear();
  }
}

export const uploadTokenService = new UploadTokenService();
