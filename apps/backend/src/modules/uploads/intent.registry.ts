import { and, eq, gt, isNull, lt } from "drizzle-orm";
import { env, isMockTestDatabaseUrl } from "../../config/env.js";
import { db } from "../../db/index.js";
import { uploadIntents } from "../../db/schema/uploads.js";
import type { UploadPurpose, UploadContentType } from "./uploads.dto.js";

export interface StoredIntent {
  uploadId: string;
  userId: string;
  purpose: UploadPurpose;
  storagePath: string;
  contentType: UploadContentType;
  sizeBytes: number;
  expiresAt: number; // timestamp in ms
  finalizedAt?: number | null;
}

export interface IntentRegistryOptions {
  useInMemory?: boolean;
}

/**
 * Persistent PostgreSQL registry for upload intents with safe in-memory fallback
 * only when running DB-less unit tests (NODE_ENV=test with placeholder DATABASE_URL).
 */
export class IntentRegistry {
  private registry = new Map<string, StoredIntent>();
  private readonly explicitInMemory?: boolean;

  constructor(options?: IntentRegistryOptions) {
    this.explicitInMemory = options?.useInMemory;
  }

  private get useInMemory(): boolean {
    if (this.explicitInMemory !== undefined) {
      return this.explicitInMemory;
    }
    return env.NODE_ENV === "test" && isMockTestDatabaseUrl(env.DATABASE_URL);
  }

  public async save(intent: StoredIntent): Promise<void> {
    if (this.useInMemory) {
      this.registry.set(intent.uploadId, { ...intent, finalizedAt: intent.finalizedAt ?? null });
      return;
    }

    await db.insert(uploadIntents).values({
      uploadId: intent.uploadId,
      userId: intent.userId,
      purpose: intent.purpose,
      contentType: intent.contentType,
      sizeBytes: intent.sizeBytes,
      storagePath: intent.storagePath,
      expiresAt: new Date(intent.expiresAt),
      finalizedAt: intent.finalizedAt ? new Date(intent.finalizedAt) : null,
    });

    // Opportunistically evict expired unfinalized intents without failing the primary insert
    try {
      await db
        .delete(uploadIntents)
        .where(
          and(
            isNull(uploadIntents.finalizedAt),
            lt(uploadIntents.expiresAt, new Date(Date.now() - 60 * 60 * 1000))
          )
        );
    } catch {
      // Non-critical cleanup failure must not fail upload intent creation
    }
  }

  public async get(uploadId: string): Promise<StoredIntent | null> {
    if (this.useInMemory) {
      return this.registry.get(uploadId) || null;
    }

    const row = await db.query.uploadIntents.findFirst({
      where: eq(uploadIntents.uploadId, uploadId),
    });

    if (!row) {
      return null;
    }

    return {
      uploadId: row.uploadId,
      userId: row.userId,
      purpose: row.purpose as UploadPurpose,
      storagePath: row.storagePath,
      contentType: row.contentType as UploadContentType,
      sizeBytes: row.sizeBytes,
      expiresAt: row.expiresAt.getTime(),
      finalizedAt: row.finalizedAt ? row.finalizedAt.getTime() : null,
    };
  }

  /**
   * Atomically marks an active, unfinalized intent owned by `userId` as finalized.
   * Returns null if already finalized, expired, missing, or owned by another user.
   */
  public async markFinalized(uploadId: string, userId: string): Promise<StoredIntent | null> {
    if (this.useInMemory) {
      const existing = this.registry.get(uploadId);
      if (
        !existing ||
        existing.userId !== userId ||
        existing.finalizedAt != null ||
        Date.now() > existing.expiresAt
      ) {
        return null;
      }
      const updated: StoredIntent = { ...existing, finalizedAt: Date.now() };
      this.registry.set(uploadId, updated);
      return updated;
    }

    const [updated] = await db
      .update(uploadIntents)
      .set({ finalizedAt: new Date() })
      .where(
        and(
          eq(uploadIntents.uploadId, uploadId),
          eq(uploadIntents.userId, userId),
          isNull(uploadIntents.finalizedAt),
          gt(uploadIntents.expiresAt, new Date())
        )
      )
      .returning();

    if (!updated) {
      return null;
    }

    return {
      uploadId: updated.uploadId,
      userId: updated.userId,
      purpose: updated.purpose as UploadPurpose,
      storagePath: updated.storagePath,
      contentType: updated.contentType as UploadContentType,
      sizeBytes: updated.sizeBytes,
      expiresAt: updated.expiresAt.getTime(),
      finalizedAt: updated.finalizedAt ? updated.finalizedAt.getTime() : null,
    };
  }

  public async delete(uploadId: string): Promise<void> {
    if (this.useInMemory) {
      this.registry.delete(uploadId);
      return;
    }
    await db.delete(uploadIntents).where(eq(uploadIntents.uploadId, uploadId));
  }

  public async clear(): Promise<void> {
    this.registry.clear();
  }
}

export const intentRegistry = new IntentRegistry();
