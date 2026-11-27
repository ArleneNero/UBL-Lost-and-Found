import { db } from "../../db/index.js";
import { foundItems, itemPhotos, servicePosts } from "../../db/schema.js";
import { generateInventoryCode } from "./inventory-code.util.js";
import { officerPolicyRepository } from "./officer-policy.repository.js";
import type { ItemCreateRequest } from "./officer.dto.js";
import { eq, and, sql, desc, asc, isNull, isNotNull, inArray, gte, lt } from "drizzle-orm";

const officerItemWithRelations = {
  photo: true as const,
  returnRecord: {
    with: {
      returnedBy: {
        columns: {
          fullName: true as const,
        },
      },
    },
  },
};

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
  includeArchived?: boolean;
  archivedOnly?: boolean;
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
    const {
      storagePostId,
      status,
      category,
      q,
      includeArchived = false,
      archivedOnly = false,
    } = params;
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const offset = (page - 1) * limit;

    const conditions = [eq(foundItems.storagePostId, storagePostId)];
    if (archivedOnly) {
      conditions.push(isNotNull(foundItems.archivedAt));
    } else if (!includeArchived) {
      conditions.push(isNull(foundItems.archivedAt));
    }
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
      with: officerItemWithRelations,
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
      with: officerItemWithRelations,
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
      const [existing] = await tx
        .select()
        .from(foundItems)
        .where(eq(foundItems.itemId, itemId))
        .for("update");

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
          currentStatus: latest?.status ?? existing.status,
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

  /**
   * B/G.2.0: Calculates overdue items dynamically from received_at and storage_limit_days
   */
  getOverdueItems(storagePostId: number) {
    return officerPolicyRepository.getOverdueItems(storagePostId);
  }

  /**
   * Read officer service post policy settings
   */
  getPostSettings(storagePostId: number) {
    return officerPolicyRepository.getPostSettings(storagePostId);
  }

  /**
   * Update officer service post storage limit (non-retroactive for existing items)
   */
  updatePostStorageLimit(storagePostId: number, storageLimitDays: number) {
    return officerPolicyRepository.updatePostStorageLimit(storagePostId, storageLimitDays);
  }

  /**
   * Soft-archives completed items (RETURNED_TO_OWNER & DISTRIBUTED), preserving audit rows & STORED items
   */
  async cleanCompletedInventory(storagePostId: number, month?: string) {
    const conditions = [
      eq(foundItems.storagePostId, storagePostId),
      isNull(foundItems.archivedAt),
      inArray(foundItems.status, ["RETURNED_TO_OWNER", "DISTRIBUTED"]),
    ];

    if (month) {
      const [yearStr, monthStr] = month.split("-");
      const year = Number(yearStr);
      const monthNum = Number(monthStr);
      const nextYear = monthNum === 12 ? year + 1 : year;
      const nextMonth = monthNum === 12 ? 1 : monthNum + 1;
      const startWib = new Date(`${yearStr}-${monthStr}-01T00:00:00+07:00`);
      const endWib = new Date(`${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00+07:00`);
      conditions.push(gte(foundItems.receivedAt, startWib), lt(foundItems.receivedAt, endWib));
    }

    const updated = await db
      .update(foundItems)
      .set({ archivedAt: new Date() })
      .where(and(...conditions))
      .returning({ itemId: foundItems.itemId });

    return { archived_count: updated.length };
  }
}

export const officerInventoryRepository = new OfficerInventoryRepository();
