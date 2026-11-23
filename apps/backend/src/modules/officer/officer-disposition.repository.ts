import { db } from "../../db/index.js";
import { foundItems, itemReturns } from "../../db/schema.js";
import { eq } from "drizzle-orm";

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
      const existing = await tx.query.foundItems.findFirst({
        where: eq(foundItems.itemId, itemId),
      });

      if (!existing) {
        return { success: false as const, error: "NOT_FOUND" as const };
      }

      if (existing.storagePostId !== storagePostId) {
        return { success: false as const, error: "FORBIDDEN" as const };
      }

      if (existing.status !== "STORED") {
        return {
          success: false as const,
          error: "INVALID_STATUS" as const,
          currentStatus: existing.status,
        };
      }

      // Update item status and hide from public catalog
      await tx
        .update(foundItems)
        .set({
          status: "RETURNED_TO_OWNER",
          isVisible: false,
        })
        .where(eq(foundItems.itemId, itemId));

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
  async distributeItem(itemId: string, storagePostId: number) {
    return await db.transaction(async (tx) => {
      const existing = await tx.query.foundItems.findFirst({
        where: eq(foundItems.itemId, itemId),
        with: { photo: true },
      });

      if (!existing) {
        return { success: false as const, error: "NOT_FOUND" as const };
      }

      if (existing.storagePostId !== storagePostId) {
        return { success: false as const, error: "FORBIDDEN" as const };
      }

      if (existing.status !== "STORED") {
        return {
          success: false as const,
          error: "INVALID_STATUS" as const,
          currentStatus: existing.status,
        };
      }

      const [updated] = await tx
        .update(foundItems)
        .set({
          status: "DISTRIBUTED",
          isVisible: false,
        })
        .where(eq(foundItems.itemId, itemId))
        .returning();

      return { success: true as const, item: updated, photo: existing.photo || null };
    });
  }
}

export const officerDispositionRepository = new OfficerDispositionRepository();
