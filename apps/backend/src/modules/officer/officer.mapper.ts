import { resolvePhotoUrl } from "../../utils/photoResolver.js";
import type { InventoryOfficerDto, ReturnRecordDto } from "./officer.dto.js";
import type { OfficerContext } from "../auth/auth.types.js";
import type { foundItems, itemPhotos, itemReturns } from "../../db/schema.js";

type FoundItemRow = typeof foundItems.$inferSelect;
type ItemPhotoRow = typeof itemPhotos.$inferSelect;
export type ItemReturnWithOfficerRow = typeof itemReturns.$inferSelect & {
  returnedBy?: { fullName: string } | null;
};

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function mapReturnRecordDto(returnRecord: ItemReturnWithOfficerRow): ReturnRecordDto {
  return {
    return_id: returnRecord.returnId,
    item_id: returnRecord.itemId,
    recipient_name: returnRecord.recipientName,
    recipient_identifier: returnRecord.recipientIdentifier ?? null,
    verification_summary: returnRecord.verificationSummary,
    verification_confirmed_at: toIsoString(returnRecord.verificationConfirmedAt),
    returned_at: toIsoString(returnRecord.returnedAt),
    returned_by_name: returnRecord.returnedBy?.fullName ?? null,
  };
}

export function mapToOfficerDto(
  item: FoundItemRow,
  photo: ItemPhotoRow | null,
  context: OfficerContext,
  returnRecord: ItemReturnWithOfficerRow | null = null
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
    received_at: toIsoString(item.receivedAt),
    storage_limit_days: item.storageLimitDays ?? null,
    archived_at: item.archivedAt ? toIsoString(item.archivedAt) : null,
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
    return_record: returnRecord ? mapReturnRecordDto(returnRecord) : null,
  };
}
