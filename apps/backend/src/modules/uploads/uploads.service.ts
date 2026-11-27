import { randomUUID } from "crypto";
import { env } from "../../config/env.js";
import type { DbClient, DbTransaction } from "../../db/index.js";
import { AppError } from "../../utils/errors.js";
import type { AuthUser } from "../auth/auth.types.js";
import type {
  UploadPurpose,
  UploadContentType,
  UploadIntent,
  UploadFinalized,
} from "./uploads.dto.js";
import type { StorageProvider } from "./storage/storage.interface.js";
import { r2Provider } from "./storage/r2.provider.js";
import { mockStorageProvider } from "./storage/mock.provider.js";
import { uploadTokenService } from "./token.service.js";
import { intentRegistry } from "./intent.registry.js";
import { generateStoragePath } from "./upload-path.util.js";
import {
  assertRoleForPurpose,
  validateImageMagicBytes,
  validateIntentForFinalize,
  validateObjectMetadata,
} from "./upload.validator.js";

export class UploadsService {
  private storage: StorageProvider;
  private readonly isCustomStorage: boolean;

  constructor(customStorage?: StorageProvider) {
    this.isCustomStorage = Boolean(customStorage);
    this.storage =
      customStorage ||
      (env.NODE_ENV !== "test" && r2Provider.isConfigured
        ? r2Provider
        : mockStorageProvider);
  }

  public async createUploadIntent(
    user: AuthUser,
    purpose: UploadPurpose,
    contentType: UploadContentType,
    sizeBytes: number
  ): Promise<UploadIntent> {
    assertRoleForPurpose(user, purpose);

    const uploadId = randomUUID();
    const storagePath = generateStoragePath(purpose, uploadId, contentType);
    const expiresInSeconds = 300; // 5 minutes
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    const putUrl = await this.storage.getPresignedPutUrl(
      storagePath,
      contentType,
      sizeBytes,
      expiresInSeconds
    );

    await intentRegistry.save({
      uploadId,
      userId: user.userId,
      purpose,
      storagePath,
      contentType,
      sizeBytes,
      expiresAt: expiresAt.getTime(),
      finalizedAt: null,
    });

    return {
      upload_id: uploadId,
      put_url: putUrl,
      expires_at: expiresAt.toISOString(),
      required_headers: { "Content-Type": contentType },
    };
  }

  public async finalizeUpload(user: AuthUser, uploadId: string): Promise<UploadFinalized> {
    const rawIntent = await intentRegistry.get(uploadId);
    const intent = validateIntentForFinalize(rawIntent, user);

    const metadata = await this.storage.headObject(intent.storagePath);
    validateObjectMetadata(metadata, intent);

    if (this.storage.getObjectHeaderBytes) {
      const headerBytes = await this.storage.getObjectHeaderBytes(intent.storagePath, 16);
      validateImageMagicBytes(headerBytes, intent.contentType);
    }

    const finalized = await intentRegistry.markFinalized(uploadId, user.userId);
    if (!finalized) {
      throw new AppError(
        "INTENT_ALREADY_FINALIZED",
        "Upload intent sudah pernah difinalisasi atau kedaluwarsa",
        409
      );
    }

    const { uploadToken, expiresAt } = uploadTokenService.issueUploadToken(
      user.userId,
      intent.purpose,
      intent.storagePath,
      900 // 15 minutes
    );

    return {
      upload_token: uploadToken,
      purpose: intent.purpose,
      expires_at: expiresAt.toISOString(),
    };
  }

  public async verifyAndConsumeUploadToken(
    uploadToken: string,
    expectedPurpose: UploadPurpose,
    expectedUserId: string,
    tx?: DbClient | DbTransaction
  ): Promise<{ storagePath: string }> {
    return await uploadTokenService.verifyAndConsume(
      uploadToken,
      expectedPurpose,
      expectedUserId,
      tx
    );
  }

  public async getSignedReadUrl(storagePath: string, expiresInSeconds = 3600): Promise<string> {
    return await this.storage.getPresignedReadUrl(storagePath, expiresInSeconds);
  }

  /**
   * Relays an image buffer from an authenticated, intent-verified PUT /uploads/:id/content request.
   */
  public async putRelayObject(
    key: string,
    body: Buffer,
    contentType: UploadContentType
  ): Promise<void> {
    if (this.storage.putObject) {
      await this.storage.putObject(key, body, contentType);
      return;
    }
    if (this.storage.simulatePut) {
      await this.storage.simulatePut(key, body, contentType);
      return;
    }
    throw new AppError("STORAGE_UNAVAILABLE", "Storage provider tidak mendukung relay upload", 500);
  }

  /**
   * Test-only upload helper. Disabled for real R2 production storage.
   */
  public async simulatePut(key: string, body: Buffer, contentType: string): Promise<void> {
    if (!this.isCustomStorage && (env.NODE_ENV !== "test" || r2Provider.isConfigured)) {
      throw new AppError(
        "FORBIDDEN",
        "simulatePut hanya diizinkan pada lingkungan uji non-produksi",
        403
      );
    }
    if (this.storage.simulatePut) {
      await this.storage.simulatePut(key, body, contentType);
    }
  }

  public async clear(): Promise<void> {
    await intentRegistry.clear();
    mockStorageProvider.clear();
    uploadTokenService.clear();
  }
}

export const uploadsService = new UploadsService();
