import { officerDispositionRepository } from "./officer-disposition.repository.js";
import { mapReturnRecordDto, mapToOfficerDto } from "./officer.mapper.js";
import { AppError } from "../../utils/errors.js";
import type { InventoryOfficerDto, ReturnRequest, ReturnRecordDto } from "./officer.dto.js";
import type { OfficerContext } from "../auth/auth.types.js";

function throwDispositionError(
  error: "NOT_FOUND" | "FORBIDDEN" | "INVALID_STATUS",
  action: "return" | "distribute",
  currentStatus?: string
): never {
  if (error === "NOT_FOUND") {
    throw new AppError("NOT_FOUND", "Barang inventaris tidak ditemukan", 404);
  }
  if (error === "FORBIDDEN") {
    throw new AppError(
      "FORBIDDEN",
      "Akses ditolak: Barang ini tidak disimpan pada pos penugasan Anda",
      403
    );
  }
  const verb = action === "return" ? "diserahkan ke pemilik" : "didistribusikan";
  throw new AppError(
    "INVALID_STATUS_TRANSITION",
    `Hanya barang berstatus STORED yang dapat ${verb} (status saat ini: ${currentStatus})`,
    409
  );
}

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
      throwDispositionError(
        result.error,
        "return",
        "currentStatus" in result ? result.currentStatus : undefined
      );
    }

    return mapReturnRecordDto({
      ...result.returnRecord,
      returnedBy: { fullName: context.user.fullName },
    });
  }

  /**
   * B/J.1.2: Distribute item under post policy
   */
  async distributeItem(
    context: OfficerContext,
    itemId: string,
    notes?: string | null
  ): Promise<InventoryOfficerDto> {
    const result = await officerDispositionRepository.distributeItem(
      itemId,
      context.postId,
      notes
    );

    if (!result.success) {
      throwDispositionError(
        result.error,
        "distribute",
        "currentStatus" in result ? result.currentStatus : undefined
      );
    }

    return mapToOfficerDto(result.item, result.photo, context);
  }
}

export const officerDispositionService = new OfficerDispositionService();
