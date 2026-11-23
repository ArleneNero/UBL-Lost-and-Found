import { resolvePhotoUrl } from "../../utils/photoResolver.js";
import type { InventoryOfficerDto } from "./officer.dto.js";
import type { OfficerContext } from "../auth/auth.types.js";
import type { foundItems, itemPhotos } from "../../db/schema.js";

type FoundItemRow = typeof foundItems.$inferSelect;
type ItemPhotoRow = typeof itemPhotos.$inferSelect;

export function mapToOfficerDto(
  item: FoundItemRow,
  photo: ItemPhotoRow | null,
  context: OfficerContext
): InventoryOfficerDto {
  const resolved = photo?.storagePath ? resolvePhotoUrl(photo.storagePath) : null;

  return {
    item_id: item.itemId,
    inventory_code: item.inventoryCode,
    item_name: item.itemName,
    category: item.category,
    public_description: item.publicDescription,
    private_verification_notes: item.privateVerificationNotes ?? null,
    found_location: item.foundLocation ?? null,
    found_on: item.foundOn ? String(item.foundOn).split("T")[0] : null,
    received_at:
      item.receivedAt instanceof Date
        ? item.receivedAt.toISOString()
        : new Date(item.receivedAt).toISOString(),
    storage_limit_days: item.storageLimitDays ?? null,
    archived_at: item.archivedAt
      ? item.archivedAt instanceof Date
        ? item.archivedAt.toISOString()
        : new Date(item.archivedAt).toISOString()
      : null,
    status: item.status,
    is_visible: item.isVisible,
    storage_post_id: item.storagePostId,
    source_submission_id: item.sourceSubmissionId || null,
    post: {
      post_id: context.postId,
      name: context.postName,
    },
    photos: resolved
      ? [
          {
            photo_id: photo!.photoId,
            url: resolved.url,
            expires_at: resolved.expires_at,
            is_primary: true,
          },
        ]
      : [],
  };
}
