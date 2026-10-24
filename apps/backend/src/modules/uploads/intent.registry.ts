import type { UploadPurpose, UploadContentType } from "./uploads.dto.js";

export interface StoredIntent {
  uploadId: string;
  userId: string;
  purpose: UploadPurpose;
  storagePath: string;
  contentType: UploadContentType;
  sizeBytes: number;
  expiresAt: number; // timestamp in ms
}

export class IntentRegistry {
  private registry = new Map<string, StoredIntent>();

  public save(intent: StoredIntent): void {
    this.registry.set(intent.uploadId, intent);
  }

  public get(uploadId: string): StoredIntent | null {
    return this.registry.get(uploadId) || null;
  }

  public delete(uploadId: string): void {
    this.registry.delete(uploadId);
  }

  public clear(): void {
    this.registry.clear();
  }
}

export const intentRegistry = new IntentRegistry();
