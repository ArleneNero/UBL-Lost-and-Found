import { officerInventoryRepository } from "./officer-inventory.repository.js";
import { uploadsService } from "../uploads/uploads.service.js";
import { mapToOfficerDto } from "./officer.mapper.js";
import { AppError } from "../../utils/errors.js";
import type { ItemCreateRequest, InventoryOfficerDto } from "./officer.dto.js";
import type { OfficerContext } from "../auth/auth.types.js";

export class OfficerInventoryService {
  /**
   * B/F.1: Registers a found item into officer inventory, consuming the photo upload token
   */
  async registerFoundItem(
    context: OfficerContext,
    request: ItemCreateRequest
  ): Promise<InventoryOfficerDto> {
    const [token] = request.item_photo_upload_tokens;

    const { storagePath } = uploadsService.verifyAndConsumeUploadToken(
      token,
      "ITEM_PHOTO",
      context.user.userId
    );

    const { item, photo } = await officerInventoryRepository.insertItemWithPhoto({
      request,
      officerUserId: context.user.userId,
      storagePostId: context.postId,
      storagePath,
    });

    return mapToOfficerDto(item, photo, context);
  }

  /**
   * B/G.1.0: List officer inventory items
   */
  async getInventory(
    context: OfficerContext,
    params: {
      status?: "STORED" | "RETURNED_TO_OWNER" | "DISTRIBUTED";
      category?: string;
      q?: string;
      sort?: "received_at_asc" | "received_at_desc";
      page?: number;
      limit?: number;
      includeArchived?: boolean;
    }
  ) {
    const result = await officerInventoryRepository.getInventoryByPost({
      storagePostId: context.postId,
      ...params,
    });

    return {
      data: result.items.map((item) => mapToOfficerDto(item, item.photo || null, context)),
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        total_pages: result.totalPages,
      },
    };
  }

  /**
   * B/G.1.1: Get single officer inventory item
   */
  async getItemDetail(context: OfficerContext, itemId: string): Promise<InventoryOfficerDto> {
    const { item, photo, forbidden } = await officerInventoryRepository.getItemById(
      itemId,
      context.postId
    );

    if (forbidden) {
      throw new AppError("FORBIDDEN", "Akses ditolak: Barang ini tidak disimpan pada pos penugasan Anda", 403);
    }

    if (!item) {
      throw new AppError("NOT_FOUND", "Barang inventaris tidak ditemukan", 404);
    }

    return mapToOfficerDto(item, photo, context);
  }

  /**
   * B/G.1.2: Toggle visibility
   */
  async updateVisibility(
    context: OfficerContext,
    itemId: string,
    isVisible: boolean
  ): Promise<InventoryOfficerDto> {
    const result = await officerInventoryRepository.updateItemVisibility(
      itemId,
      context.postId,
      isVisible
    );

    if (!result.success) {
      if (result.error === "NOT_FOUND") {
        throw new AppError("NOT_FOUND", "Barang inventaris tidak ditemukan", 404);
      }
      if (result.error === "FORBIDDEN") {
        throw new AppError("FORBIDDEN", "Akses ditolak: Barang ini tidak disimpan pada pos penugasan Anda", 403);
      }
      if (result.error === "INVALID_STATUS") {
        throw new AppError(
          "INVALID_STATUS_TRANSITION",
          `Hanya barang berstatus STORED yang visibilitasnya dapat diubah (status saat ini: ${result.currentStatus})`,
          409
        );
      }
    }

    return mapToOfficerDto(result.item, result.photo, context);
  }

  /**
   * B/G.2.0: Get overdue items list
   */
  async getOverdue(context: OfficerContext) {
    return await officerInventoryRepository.getOverdueItems(context.postId);
  }

  /**
   * Read officer post storage policy settings
   */
  async getPostSettings(context: OfficerContext) {
    const settings = await officerInventoryRepository.getPostSettings(context.postId);
    if (!settings) {
      throw new AppError("NOT_FOUND", "Pengaturan pos layanan tidak ditemukan", 404);
    }
    return settings;
  }

  /**
   * Update officer post storage policy settings (applies to new items only)
   */
  async updatePostSettings(context: OfficerContext, storageLimitDays: number) {
    const updated = await officerInventoryRepository.updatePostStorageLimit(
      context.postId,
      storageLimitDays
    );
    if (!updated) {
      throw new AppError("NOT_FOUND", "Pengaturan pos layanan tidak ditemukan", 404);
    }
    return updated;
  }

  /**
   * Soft-archive completed items (RETURNED_TO_OWNER / DISTRIBUTED)
   */
  async cleanCompletedInventory(context: OfficerContext, month?: string) {
    return await officerInventoryRepository.cleanCompletedInventory(context.postId, month);
  }
}

export const officerInventoryService = new OfficerInventoryService();
