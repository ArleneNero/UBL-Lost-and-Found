import { db } from "../../db/index.js";
import { foundItems, itemPhotos } from "../../db/schema.js";
import { generateInventoryCode } from "./inventory-code.util.js";
import type { ItemCreateRequest } from "./officer.dto.js";

export interface CreateItemParams {
  request: ItemCreateRequest;
  officerUserId: string;
  storagePostId: number;
  storagePath: string;
}

export class OfficerRepository {
  /**
   * Executes atomic insertion of found item and its primary photo within a transaction
   */
  async insertItemWithPhoto(params: CreateItemParams) {
    const { request, officerUserId, storagePostId, storagePath } = params;

    return await db.transaction(async (tx) => {
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
}

export const officerRepository = new OfficerRepository();
