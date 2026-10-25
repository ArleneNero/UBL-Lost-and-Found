import { randomUUID } from "crypto";
import { env } from "../../config/env.js";
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
  validateIntentForFinalize,
  validateObjectMetadata,
} from "./upload.validator.js";

export class UploadsService {
  private storage: StorageProvider;

  constructor(customStorage?: StorageProvider) {
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

    intentRegistry.save({
      uploadId,
      userId: user.userId,
      purpose,
      storagePath,
      contentType,
      sizeBytes,
      expiresAt: expiresAt.getTime(),
    });

    return {
      upload_id: uploadId,
      put_url: putUrl,
      expires_at: expiresAt.toISOString(),
      required_headers: { "Content-Type": contentType },
    };
  }

  public async finalizeUpload(user: AuthUser, uploadId: string): Promise<UploadFinalized> {
    const rawIntent = intentRegistry.get(uploadId);
    const intent = validateIntentForFinalize(rawIntent, user);

    const metadata = await this.storage.headObject(intent.storagePath);
    validateObjectMetadata(metadata, intent);

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

  public verifyAndConsumeUploadToken(
    uploadToken: string,
    expectedPurpose: UploadPurpose,
    expectedUserId: string
  ): { storagePath: string } {
    return uploadTokenService.verifyAndConsume(uploadToken, expectedPurpose, expectedUserId);
  }

  public async getSignedReadUrl(storagePath: string, expiresInSeconds = 3600): Promise<string> {
    return await this.storage.getPresignedReadUrl(storagePath, expiresInSeconds);
  }

  public async simulatePut(key: string, body: Buffer, contentType: string): Promise<void> {
    if (this.storage.simulatePut) {
      await this.storage.simulatePut(key, body, contentType);
    }
  }

  public clear(): void {
    intentRegistry.clear();
    mockStorageProvider.clear();
    uploadTokenService.clear();
  }
}

export const uploadsService = new UploadsService();
