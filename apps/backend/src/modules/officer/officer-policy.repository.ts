import { db } from "../../db/index.js";
import { foundItems, servicePosts } from "../../db/schema.js";
import { eq, and, isNull } from "drizzle-orm";

export class OfficerPolicyRepository {
  /**
   * B/G.2.0: Calculates overdue items dynamically from received_at and storage_limit_days
   */
  async getOverdueItems(storagePostId: number) {
    const post = await db.query.servicePosts.findFirst({
      where: eq(servicePosts.postId, storagePostId),
    });

    if (!post) {
      return [];
    }

    const postFallbackLimit =
      post.storageLimitDays !== null && post.storageLimitDays > 0
        ? post.storageLimitDays
        : 365;
    const now = new Date();

    const storedItems = await db.query.foundItems.findMany({
      where: and(
        eq(foundItems.storagePostId, storagePostId),
        eq(foundItems.status, "STORED"),
        isNull(foundItems.archivedAt)
      ),
    });

    const overdueList = [];
    for (const item of storedItems) {
      const effectiveLimit =
        item.storageLimitDays !== null && item.storageLimitDays > 0
          ? item.storageLimitDays
          : postFallbackLimit;
      const receivedDate = new Date(item.receivedAt);
      const ageMs = now.getTime() - receivedDate.getTime();
      const storageAgeDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));

      if (storageAgeDays > effectiveLimit) {
        overdueList.push({
          item_id: item.itemId,
          inventory_code: item.inventoryCode,
          item_name: item.itemName,
          category: item.category,
          received_at:
            item.receivedAt instanceof Date
              ? item.receivedAt.toISOString()
              : new Date(item.receivedAt).toISOString(),
          storage_limit_days: effectiveLimit,
          storage_age_days: storageAgeDays,
          overdue_days: storageAgeDays - effectiveLimit,
        });
      }
    }

    return overdueList;
  }

  /**
   * Read officer service post policy settings
   */
  async getPostSettings(storagePostId: number) {
    const post = await db.query.servicePosts.findFirst({
      where: eq(servicePosts.postId, storagePostId),
      columns: {
        postId: true,
        name: true,
        storageLimitDays: true,
      },
    });
    if (!post) return null;
    return {
      post_id: post.postId,
      name: post.name,
      storage_limit_days:
        post.storageLimitDays && post.storageLimitDays > 0 ? post.storageLimitDays : 365,
    };
  }

  /**
   * Update officer service post storage limit (non-retroactive for existing items)
   */
  async updatePostStorageLimit(storagePostId: number, storageLimitDays: number) {
    const [updated] = await db
      .update(servicePosts)
      .set({ storageLimitDays })
      .where(eq(servicePosts.postId, storagePostId))
      .returning({
        postId: servicePosts.postId,
        name: servicePosts.name,
        storageLimitDays: servicePosts.storageLimitDays,
      });

    if (!updated) return null;
    return {
      post_id: updated.postId,
      name: updated.name,
      storage_limit_days: updated.storageLimitDays ?? storageLimitDays,
    };
  }
}

export const officerPolicyRepository = new OfficerPolicyRepository();
