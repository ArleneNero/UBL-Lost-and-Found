import { randomUUID } from "crypto";
import { itemsRepository, ItemQueryResult } from "./items.repository.js";
import { FoundItemPublic, ItemsResponse, ListItemsQuery } from "./items.dto.js";
import { resolvePhotoUrl } from "../../utils/photoResolver.js";

export class ItemsService {
  /**
   * List public found items with defensive filtering, sorting, pagination, and strict privacy enforcement.
   * Only items with status = 'STORED' AND is_visible = true are ever returned.
   */
  async listPublicItems(params: ListItemsQuery): Promise<ItemsResponse> {
    const { page, limit } = params;
    const offset = (page - 1) * limit;

    const whereClause = itemsRepository.buildFilterConditions(params);
    const orderClauses = itemsRepository.getOrderClauses(params.sort);

    const total = await itemsRepository.countItems(whereClause);
    const total_pages = Math.ceil(total / limit) || (total === 0 ? 0 : 1);

    const rows = await itemsRepository.findPublicItems(whereClause, orderClauses, offset, limit);
    const data: FoundItemPublic[] = rows.map((row) => this.mapToPublicDto(row));

    return {
      data,
      meta: { page, limit, total, total_pages },
    };
  }

  /**
   * Get public item detail by itemId.
   * Returns null if item is not found, status != 'STORED', or is_visible = false.
   */
  async getPublicItemById(itemId: string): Promise<FoundItemPublic | null> {
    const row = await itemsRepository.findPublicItemById(itemId);
    if (!row) return null;
    return this.mapToPublicDto(row);
  }

  private mapToPublicDto(row: ItemQueryResult): FoundItemPublic {
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
