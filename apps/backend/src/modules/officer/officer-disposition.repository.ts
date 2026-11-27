import { db, type DbTransaction } from "../../db/index.js";
import { foundItems, itemPhotos, itemReturns } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";

type FoundItemRow = typeof foundItems.$inferSelect;

type LockedItemResult =
  | { success: true; item: FoundItemRow }
  | { success: false; error: "NOT_FOUND" | "FORBIDDEN" }
  | { success: false; error: "INVALID_STATUS"; currentStatus: FoundItemRow["status"] };

async function lockStoredItemForUpdate(
  tx: DbTransaction,
  itemId: string,
  storagePostId: number
): Promise<LockedItemResult> {
  const [existing] = await tx
    .select()
    .from(foundItems)
    .where(eq(foundItems.itemId, itemId))
    .for("update");

  if (!existing) {
    return { success: false, error: "NOT_FOUND" };
  }

  if (existing.storagePostId !== storagePostId) {
    return { success: false, error: "FORBIDDEN" };
  }

  if (existing.status !== "STORED") {
    return {
      success: false,
      error: "INVALID_STATUS",
      currentStatus: existing.status,
    };
  }

  return { success: true, item: existing };
}

function formatDistributedNotes(
  existingNotes: string | null,
  rawNotes?: string | null
): string | undefined {
  const trimmed = rawNotes?.trim();
  if (!trimmed) {
    return undefined;
  }
  const entry = `[DISALURKAN] ${trimmed}`;
  return existingNotes?.trim() ? `${existingNotes.trim()}\n${entry}` : entry;
}

export class OfficerDispositionRepository {
  /**
   * B/J.1.0: Returns item to verified owner atomically
   */
  async returnItem(params: {
    itemId: string;
    officerUserId: string;
    storagePostId: number;
    recipientName: string;
    recipientIdentifier?: string | null;
    verificationSummary: string;
  }) {
    const {
      itemId,
      officerUserId,
      storagePostId,
      recipientName,
      recipientIdentifier,
      verificationSummary,
    } = params;

    return await db.transaction(async (tx) => {
      const lockResult = await lockStoredItemForUpdate(tx, itemId, storagePostId);
      if (!lockResult.success) {
        return lockResult;
      }

      // Update item status and hide from public catalog with atomic status guard
      const [updated] = await tx
        .update(foundItems)
        .set({
          status: "RETURNED_TO_OWNER",
          isVisible: false,
        })
        .where(
          and(
            eq(foundItems.itemId, itemId),
            eq(foundItems.storagePostId, storagePostId),
            eq(foundItems.status, "STORED")
          )
        )
        .returning();

      if (!updated) {
        const [latest] = await tx
          .select({ status: foundItems.status })
          .from(foundItems)
          .where(eq(foundItems.itemId, itemId));
        return {
          success: false as const,
          error: "INVALID_STATUS" as const,
          currentStatus: latest?.status ?? lockResult.item.status,
        };
      }

      // Insert item_returns record
      const [record] = await tx
        .insert(itemReturns)
        .values({
          itemId,
          returnedByUserId: officerUserId,
          recipientName,
          recipientIdentifier: recipientIdentifier || null,
          verificationSummary,
        })
        .returning();

      return { success: true as const, returnRecord: record };
    });
  }

  /**
   * B/J.1.2: Distributes item under post policy atomically (no item_returns created)
   */
  async distributeItem(itemId: string, storagePostId: number, notes?: string | null) {
    return await db.transaction(async (tx) => {
      const lockResult = await lockStoredItemForUpdate(tx, itemId, storagePostId);
      if (!lockResult.success) {
        return lockResult;
      }

      const nextNotes = formatDistributedNotes(lockResult.item.privateVerificationNotes, notes);
      const updateSet: Partial<typeof foundItems.$inferInsert> = {
        status: "DISTRIBUTED",
        isVisible: false,
      };
      if (nextNotes !== undefined) {
        updateSet.privateVerificationNotes = nextNotes;
      }

      const [updated] = await tx
        .update(foundItems)
        .set(updateSet)
        .where(
          and(
            eq(foundItems.itemId, itemId),
            eq(foundItems.storagePostId, storagePostId),
            eq(foundItems.status, "STORED")
          )
        )
        .returning();

      if (!updated) {
        const [latest] = await tx
          .select({ status: foundItems.status })
          .from(foundItems)
          .where(eq(foundItems.itemId, itemId));
        return {
          success: false as const,
          error: "INVALID_STATUS" as const,
          currentStatus: latest?.status ?? lockResult.item.status,
        };
      }

      const [photoRow] = await tx
        .select()
        .from(itemPhotos)
        .where(eq(itemPhotos.itemId, itemId));
      const photo: typeof itemPhotos.$inferSelect | null = photoRow ?? null;

      return { success: true as const, item: updated, photo };
    });
  }
}

export const officerDispositionRepository = new OfficerDispositionRepository();
