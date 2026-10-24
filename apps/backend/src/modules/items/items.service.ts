import { randomUUID } from "crypto";
import { db } from "../../db/index.js";
import { foundItems, servicePosts, itemPhotos } from "../../db/schema.js";
import { eq, and, asc, desc, count, sql, SQL } from "drizzle-orm";
import { FoundItemPublic, ItemsResponse, ListItemsQuery } from "./items.dto.js";
import { resolvePhotoUrl } from "../../utils/photoResolver.js";

export class ItemsService {
  /**
   * List public found items with defensive filtering, sorting, pagination, and strict privacy enforcement.
   * Only items with status = 'STORED' AND is_visible = true are ever returned.
   */
  async listPublicItems(params: ListItemsQuery): Promise<ItemsResponse> {
    const { page, limit, q, category, post_id, sort } = params;
    const offset = (page - 1) * limit;

    // Build conditions list starting with mandatory privacy bounds
    const conditions: SQL[] = [
      eq(foundItems.status, "STORED"),
      eq(foundItems.isVisible, true),
    ];

    // Filter by post_id
    if (post_id !== undefined) {
      conditions.push(eq(foundItems.storagePostId, post_id));
    }

    // Filter by category (case-insensitive)
    if (category && category.trim().length > 0) {
      conditions.push(sql`LOWER(${foundItems.category}) = LOWER(${category.trim()})`);
    }

    // Filter by keyword q (defensive against SQL injection and wildcard abuse)
    if (q && q.trim().length > 0) {
      const sanitizedQ = q.trim().replace(/[%_\\]/g, "\\$&");
      const pattern = `%${sanitizedQ}%`;
      conditions.push(
        sql`(${foundItems.itemName} ILIKE ${pattern} ESCAPE '\\' OR ${foundItems.publicDescription} ILIKE ${pattern} ESCAPE '\\')`
      );
    }

    const whereClause = and(...conditions);

    // 1. Total matching count
    const [totalRecord] = await db
      .select({ value: count() })
      .from(foundItems)
      .where(whereClause);

    const total = Number(totalRecord?.value || 0);
    const total_pages = Math.ceil(total / limit) || (total === 0 ? 0 : 1);

    // 2. Ordering with stable tie-breaker item_id
    let orderClauses;
    if (sort === "received_at_asc") {
      orderClauses = [asc(foundItems.receivedAt), asc(foundItems.itemId)];
    } else if (sort === "item_name_asc") {
      orderClauses = [asc(foundItems.itemName), asc(foundItems.itemId)];
    } else {
      // Default: received_at_desc
      orderClauses = [desc(foundItems.receivedAt), asc(foundItems.itemId)];
    }

    // 3. Query items with JOINs to service_posts and item_photos
    const rows = await db
      .select({
        itemId: foundItems.itemId,
        inventoryCode: foundItems.inventoryCode,
        itemName: foundItems.itemName,
        category: foundItems.category,
        publicDescription: foundItems.publicDescription,
        foundLocation: foundItems.foundLocation,
        foundOn: foundItems.foundOn,
        receivedAt: foundItems.receivedAt,
        postId: servicePosts.postId,
        postName: servicePosts.name,
        photoId: itemPhotos.photoId,
        photoStoragePath: itemPhotos.storagePath,
      })
      .from(foundItems)
      .innerJoin(servicePosts, eq(foundItems.storagePostId, servicePosts.postId))
      .leftJoin(itemPhotos, eq(foundItems.itemId, itemPhotos.itemId))
      .where(whereClause)
      .orderBy(...orderClauses)
      .limit(limit)
      .offset(offset);

    // 4. Map to FoundItemPublic DTO (zero PII exposure)
    const data: FoundItemPublic[] = rows.map((row) => {
      const resolved = row.photoStoragePath
        ? resolvePhotoUrl(row.photoStoragePath)
        : {
            url: "https://r2.campusfind.local/placeholder.webp",
            expires_at: new Date(Date.now() + 3600000).toISOString(),
          };

      return {
        item_id: row.itemId,
        inventory_code: row.inventoryCode,
        item_name: row.itemName,
        category: row.category,
        public_description: row.publicDescription,
        found_location: row.foundLocation,
        found_on: row.foundOn ? String(row.foundOn) : null,
        received_at:
          row.receivedAt instanceof Date
            ? row.receivedAt.toISOString()
            : new Date(row.receivedAt).toISOString(),
        post: {
          post_id: row.postId,
          name: row.postName,
        },
        photos: [
          {
            photo_id: row.photoId || randomUUID(),
            url: resolved.url,
            expires_at: resolved.expires_at,
            is_primary: true,
          },
        ],
      };
    });

    return {
      data,
      meta: {
        page,
        limit,
        total,
        total_pages,
      },
    };
  }

  /**
   * Get public item detail by itemId.
   * Returns null if item is not found, status != 'STORED', or is_visible = false.
   */
  async getPublicItemById(itemId: string): Promise<FoundItemPublic | null> {
    const [row] = await db
      .select({
        itemId: foundItems.itemId,
        inventoryCode: foundItems.inventoryCode,
        itemName: foundItems.itemName,
        category: foundItems.category,
        publicDescription: foundItems.publicDescription,
        foundLocation: foundItems.foundLocation,
        foundOn: foundItems.foundOn,
        receivedAt: foundItems.receivedAt,
        postId: servicePosts.postId,
        postName: servicePosts.name,
        photoId: itemPhotos.photoId,
        photoStoragePath: itemPhotos.storagePath,
      })
      .from(foundItems)
      .innerJoin(servicePosts, eq(foundItems.storagePostId, servicePosts.postId))
      .leftJoin(itemPhotos, eq(foundItems.itemId, itemPhotos.itemId))
      .where(
        and(
          eq(foundItems.itemId, itemId),
          eq(foundItems.status, "STORED"),
          eq(foundItems.isVisible, true)
        )
      )
      .limit(1);

    if (!row) {
      return null;
    }

    const resolved = row.photoStoragePath
      ? resolvePhotoUrl(row.photoStoragePath)
      : {
          url: "https://r2.campusfind.local/placeholder.webp",
          expires_at: new Date(Date.now() + 3600000).toISOString(),
        };

    return {
      item_id: row.itemId,
      inventory_code: row.inventoryCode,
      item_name: row.itemName,
      category: row.category,
      public_description: row.publicDescription,
      found_location: row.foundLocation,
      found_on: row.foundOn ? String(row.foundOn) : null,
      received_at:
        row.receivedAt instanceof Date
          ? row.receivedAt.toISOString()
          : new Date(row.receivedAt).toISOString(),
      post: {
        post_id: row.postId,
        name: row.postName,
      },
      photos: [
        {
          photo_id: row.photoId || randomUUID(),
          url: resolved.url,
          expires_at: resolved.expires_at,
          is_primary: true,
        },
      ],
    };
  }
}

export const itemsService = new ItemsService();
