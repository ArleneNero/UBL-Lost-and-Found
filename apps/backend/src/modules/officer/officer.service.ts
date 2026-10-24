import { officerRepository } from "./officer.repository.js";
import { uploadsService } from "../uploads/uploads.service.js";
import { resolvePhotoUrl } from "../../utils/photoResolver.js";
import type { ItemCreateRequest, InventoryOfficerDto } from "./officer.dto.js";
import type { OfficerContext } from "../auth/auth.types.js";

export class OfficerService {
  /**
   * Registers a found item into officer inventory, consuming the photo upload token
   */
  async registerFoundItem(
    context: OfficerContext,
    request: ItemCreateRequest
  ): Promise<InventoryOfficerDto> {
    const [token] = request.item_photo_upload_tokens;

    // Verify and consume single-use upload token bound to this officer
    const { storagePath } = uploadsService.verifyAndConsumeUploadToken(
      token,
      "ITEM_PHOTO",
      context.user.userId
    );

    // Atomically insert item and photo
    const { item, photo } = await officerRepository.insertItemWithPhoto({
      request,
      officerUserId: context.user.userId,
      storagePostId: context.postId,
      storagePath,
    });

    return this.mapToOfficerDto(item, photo, context);
  }

  private mapToOfficerDto(
    item: any,
    photo: any,
    context: OfficerContext
  ): InventoryOfficerDto {
    const resolved = resolvePhotoUrl(photo.storagePath);

    return {
      item_id: item.itemId,
      inventory_code: item.inventoryCode,
      item_name: item.itemName,
      category: item.category,
      public_description: item.publicDescription,
      private_verification_notes: item.privateVerificationNotes,
      found_location: item.foundLocation,
      found_on: item.foundOn ? String(item.foundOn) : null,
      received_at:
        item.receivedAt instanceof Date
          ? item.receivedAt.toISOString()
          : new Date(item.receivedAt).toISOString(),
      status: item.status,
      is_visible: item.isVisible,
      storage_post_id: item.storagePostId,
      source_submission_id: item.sourceSubmissionId || null,
      post: {
        post_id: context.postId,
        name: context.postName,
      },
      photos: [
        {
          photo_id: photo.photoId,
          url: resolved.url,
          expires_at: resolved.expires_at,
          is_primary: true,
        },
      ],
    };
  }
}

export const officerService = new OfficerService();
