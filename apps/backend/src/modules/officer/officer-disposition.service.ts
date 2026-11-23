import { officerDispositionRepository } from "./officer-disposition.repository.js";
import { mapReturnRecordDto, mapToOfficerDto } from "./officer.mapper.js";
import { AppError } from "../../utils/errors.js";
import type { InventoryOfficerDto, ReturnRequest, ReturnRecordDto } from "./officer.dto.js";
import type { OfficerContext } from "../auth/auth.types.js";

export class OfficerDispositionService {
  /**
   * B/J.1.0: Return item to verified owner
   */
  async returnItem(
    context: OfficerContext,
    itemId: string,
    request: ReturnRequest
  ): Promise<ReturnRecordDto> {
    const result = await officerDispositionRepository.returnItem({
      itemId,
      officerUserId: context.user.userId,
      storagePostId: context.postId,
      recipientName: request.recipient_name,
      recipientIdentifier: request.recipient_identifier?.trim() || null,
      verificationSummary: request.verification_summary,
    });

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
          `Hanya barang berstatus STORED yang dapat diserahkan ke pemilik (status saat ini: ${result.currentStatus})`,
          409
        );
      }
    }

    return mapReturnRecordDto({
      ...result.returnRecord,
      returnedBy: { fullName: context.user.fullName },
    });
  }

  /**
   * B/J.1.2: Distribute item under post policy
   */
  async distributeItem(context: OfficerContext, itemId: string): Promise<InventoryOfficerDto> {
    const result = await officerDispositionRepository.distributeItem(itemId, context.postId);

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
          `Hanya barang berstatus STORED yang dapat didistribusikan (status saat ini: ${result.currentStatus})`,
          409
        );
      }
    }

    return mapToOfficerDto(result.item, result.photo, context);
  }
}

export const officerDispositionService = new OfficerDispositionService();
