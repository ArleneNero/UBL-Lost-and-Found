import { db } from "../../db/index.js";
import { foundItems, servicePosts, itemPhotos } from "../../db/schema.js";
import { eq, and, asc, desc, count, sql, SQL } from "drizzle-orm";
import { ListItemsQuery } from "./items.dto.js";

export interface ItemQueryResult {
  itemId: string;
  inventoryCode: string;
  itemName: string;
  category: string;
  publicDescription: string;
  foundLocation: string | null;
  foundOn: string | null;
  receivedAt: Date;
  postId: number;
  postName: string;
  photoId: string | null;
  photoStoragePath: string | null;
}

export class ItemsRepository {
  buildFilterConditions(params: ListItemsQuery): SQL {
    const conditions: SQL[] = [
      eq(foundItems.status, "STORED"),
      eq(foundItems.isVisible, true),
    ];

    if (params.post_id !== undefined) {
      conditions.push(eq(foundItems.storagePostId, params.post_id));
    }

    if (params.category && params.category.trim().length > 0) {
      conditions.push(sql`LOWER(${foundItems.category}) = LOWER(${params.category.trim()})`);
    }

    if (params.q && params.q.trim().length > 0) {
      const sanitizedQ = params.q.trim().replace(/[%_\\]/g, "\\$&");
      const pattern = `%${sanitizedQ}%`;
      conditions.push(
        sql`(${foundItems.itemName} ILIKE ${pattern} ESCAPE '\\' OR ${foundItems.publicDescription} ILIKE ${pattern} ESCAPE '\\')`
      );
    }

    return and(...conditions)!;
  }

  getOrderClauses(sort?: string) {
    if (sort === "received_at_asc") {
      return [asc(foundItems.receivedAt), asc(foundItems.itemId)];
    }
    if (sort === "item_name_asc") {
      return [asc(foundItems.itemName), asc(foundItems.itemId)];
    }
    return [desc(foundItems.receivedAt), asc(foundItems.itemId)];
  }

  async countItems(whereClause: SQL): Promise<number> {
    const [totalRecord] = await db
      .select({ value: count() })
      .from(foundItems)
      .where(whereClause);
    return Number(totalRecord?.value || 0);
  }

  async findPublicItems(
    whereClause: SQL,
    orderClauses: SQL[],
    offset: number,
    limit: number
  ): Promise<ItemQueryResult[]> {
    return db
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
  }

  async findPublicItemById(itemId: string): Promise<ItemQueryResult | null> {
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

    return row || null;
  }
}

export const itemsRepository = new ItemsRepository();
