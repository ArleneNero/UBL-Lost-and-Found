import { db } from "../../db/index.js";
import { foundItems, itemPhotos, servicePosts } from "../../db/schema.js";
import { generateInventoryCode } from "./inventory-code.util.js";
import type { ItemCreateRequest } from "./officer.dto.js";
import { eq, and, sql, desc, asc } from "drizzle-orm";

export interface CreateItemParams {
  request: ItemCreateRequest;
  officerUserId: string;
  storagePostId: number;
  storagePath: string;
}

export interface GetOfficerInventoryParams {
  storagePostId: number;
  status?: "STORED" | "RETURNED_TO_OWNER" | "DISTRIBUTED";
  category?: string;
  q?: string;
  sort?: "received_at_asc" | "received_at_desc";
  page?: number;
  limit?: number;
}

export class OfficerInventoryRepository {
  /**
   * B/F.1: Executes atomic insertion of found item and its primary photo within a transaction
   */
  async insertItemWithPhoto(params: CreateItemParams) {
    const { request, officerUserId, storagePostId, storagePath } = params;

    return await db.transaction(async (tx) => {
      const post = await tx.query.servicePosts.findFirst({
        where: eq(servicePosts.postId, storagePostId),
        columns: { storageLimitDays: true },
      });
      const snapshotLimitDays =
        post?.storageLimitDays && post.storageLimitDays > 0 ? post.storageLimitDays : 365;
      const inventoryCode = await generateInventoryCode(tx);

      const [item] = await tx
        .insert(foundItems)
        .values({
          inventoryCode,
          recordedByUserId: officerUserId,
          storagePostId,
          itemName: request.item_name,
          category: request.category,
          publicDescription: request.public_description,
          privateVerificationNotes: request.private_verification_notes ?? null,
          foundLocation: request.found_location ?? null,
          foundOn: request.found_on ?? null,
          storageLimitDays: snapshotLimitDays,
          status: "STORED",
          isVisible: true,
        })
        .returning();

      const [photo] = await tx
        .insert(itemPhotos)
        .values({
          itemId: item.itemId,
          storagePath,
          isPrimary: true,
        })
        .returning();

      return { item, photo };
    });
  }

  /**
   * B/G.1.0: Lists inventory items stored at this post with filters and pagination
   */
  async getInventoryByPost(params: GetOfficerInventoryParams) {
    const { storagePostId, status, category, q } = params;
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(10, Math.max(1, params.limit || 10));
    const offset = (page - 1) * limit;

    const conditions = [eq(foundItems.storagePostId, storagePostId)];
    if (status) {
      conditions.push(eq(foundItems.status, status));
    }
    if (category && category !== "ALL") {
      conditions.push(eq(foundItems.category, category));
    }
    if (q?.trim()) {
      const escaped = q.trim().replace(/[%_\\]/g, "\\$&");
      const term = `%${escaped}%`;
      conditions.push(
        sql`(${foundItems.itemName} ILIKE ${term} ESCAPE '\\' OR ${foundItems.publicDescription} ILIKE ${term} ESCAPE '\\')`
      );
    }

    const whereClause = and(...conditions);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(foundItems)
      .where(whereClause);

    const total = countResult?.count || 0;
    const totalPages = Math.ceil(total / limit) || 1;

    const sortOrder =
      params.sort === "received_at_asc"
        ? asc(foundItems.receivedAt)
        : desc(foundItems.receivedAt);

    const items = await db.query.foundItems.findMany({
      where: whereClause,
      with: {
        photo: true,
      },
      orderBy: [sortOrder],
      limit,
      offset,
    });

    return { items, total, page, limit, totalPages };
  }

  /**
   * B/G.1.1: Get single inventory item detail for post officer
   */
  async getItemById(itemId: string, storagePostId: number) {
    const item = await db.query.foundItems.findFirst({
      where: eq(foundItems.itemId, itemId),
      with: {
        photo: true,
      },
    });

    if (!item) {
      return { item: null, photo: null, forbidden: false };
    }

    if (item.storagePostId !== storagePostId) {
      return { item: null, photo: null, forbidden: true };
    }

    return { item, photo: item.photo || null, forbidden: false };
  }

  /**
   * B/G.1.2: Updates item visibility (only allowed when status = STORED)
   */
  async updateItemVisibility(itemId: string, storagePostId: number, isVisible: boolean) {
    return await db.transaction(async (tx) => {
      const existing = await db.query.foundItems.findFirst({
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
        .set({ isVisible })
        .where(eq(foundItems.itemId, itemId))
        .returning();

      return { success: true as const, item: updated, photo: existing.photo || null };
    });
  }

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
        eq(foundItems.status, "STORED")
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

export const officerInventoryRepository = new OfficerInventoryRepository();
