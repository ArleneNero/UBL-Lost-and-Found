import { env } from "../../../config/env.js";
import type { StorageProvider, ObjectMetadata } from "./storage.interface.js";

export class MockStorageProvider implements StorageProvider {
  private objects = new Map<
    string,
    { body: Buffer; contentType: string; contentLength: number; uploadedAt: Date }
  >();

  public async getPresignedPutUrl(
    storagePath: string,
    _contentType: string,
    _contentLength: number,
    expiresInSeconds: number
  ): Promise<string> {
    const expiresEpoch = Math.floor(Date.now() / 1000) + expiresInSeconds;
    return `https://mock-r2.local/${env.R2_BUCKET_NAME}/${storagePath}?expires=${expiresEpoch}`;
  }

  public async headObject(key: string): Promise<ObjectMetadata> {
    const obj = this.objects.get(key);
    if (!obj) {
      return { contentLength: 0, contentType: "", exists: false };
    }
    return {
      contentLength: obj.contentLength,
      contentType: obj.contentType,
      exists: true,
    };
  }

  public async getPresignedReadUrl(
    storagePath: string,
    expiresInSeconds: number
  ): Promise<string> {
    if (env.R2_PUBLIC_URL) {
      return `${env.R2_PUBLIC_URL}/${storagePath}`;
    }
    return `https://mock-r2.local/${env.R2_BUCKET_NAME}/${storagePath}?expires_in=${expiresInSeconds}`;
  }

  public async simulatePut(
    key: string,
    body: Buffer,
    contentType: string
  ): Promise<void> {
    this.objects.set(key, {
      body,
      contentType,
      contentLength: body.length,
      uploadedAt: new Date(),
    });
  }

  public clear(): void {
    this.objects.clear();
  }
}

export const mockStorageProvider = new MockStorageProvider();
