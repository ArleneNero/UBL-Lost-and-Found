import { officerSubmissionsRepository } from "./officer-submissions.repository.js";
import { uploadsService } from "../uploads/uploads.service.js";
import { submissionsService } from "../submissions/submissions.service.js";
import { mapToOfficerDto } from "./officer.mapper.js";
import { AppError } from "../../utils/errors.js";
import type { InventoryOfficerDto, ReceiveRequest } from "./officer.dto.js";
import type { OfficerContext } from "../auth/auth.types.js";
import type { ReportStatus } from "../submissions/submissions.dto.js";

export class OfficerSubmissionsService {
  /**
   * B/I.1.0: List submissions targeting this officer's post
   */
  async getSubmissions(
    context: OfficerContext,
    params: { status?: ReportStatus; page?: number; limit?: number }
  ) {
    const result = await officerSubmissionsRepository.getSubmissionsByPost(context.postId, params);

    return {
      data: result.items.map((sub) => submissionsService.mapToSubmissionDto(sub)),
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        total_pages: result.totalPages,
      },
    };
  }

  /**
   * B/I.1.1 & B/I.1.2: Officer physically receives item at post and registers into inventory
   */
  async receiveSubmission(
    context: OfficerContext,
    submissionId: string,
    request: ReceiveRequest
  ): Promise<InventoryOfficerDto> {
    const token = request.item_photo_upload_tokens?.[0];
    let storagePath: string | undefined;

    if (token) {
      const consumed = uploadsService.verifyAndConsumeUploadToken(
        token,
        "ITEM_PHOTO",
        context.user.userId
      );
      storagePath = consumed.storagePath;
    }

    const result = await officerSubmissionsRepository.receiveSubmission({
      submissionId,
      officerUserId: context.user.userId,
      storagePostId: context.postId,
      publicDescription: request.public_description,
      privateVerificationNotes: request.private_verification_notes,
      storagePath,
    });

    if (!result.success) {
      if (result.error === "NOT_FOUND") {
        throw new AppError("NOT_FOUND", "Laporan temuan tidak ditemukan", 404);
      }
      if (result.error === "FORBIDDEN") {
        throw new AppError("FORBIDDEN", "Akses ditolak: Laporan ini bukan ditujukan ke pos pelayanan Anda", 403);
      }
      if (result.error === "INVALID_STATUS") {
        throw new AppError(
          "INVALID_STATUS_TRANSITION",
          `Hanya laporan berstatus PENDING_RECEIPT yang dapat diterima fisik (status saat ini: ${result.currentStatus})`,
          409
        );
      }
      if (result.error === "MISSING_PHOTO") {
        throw new AppError(
          "MISSING_PHOTO",
          "Foto barang tidak tersedia pada laporan maupun payload penerimaan",
          422
        );
      }
    }

    return mapToOfficerDto(result.item, result.photo, context);
  }

  /**
   * B/I.2.0: Officer rejects submission
   */
  async rejectSubmission(context: OfficerContext, submissionId: string, reason: string) {
    const result = await officerSubmissionsRepository.rejectSubmission(
      submissionId,
      context.user.userId,
      context.postId,
      reason
    );

    if (!result.success) {
      if (result.error === "NOT_FOUND") {
        throw new AppError("NOT_FOUND", "Laporan temuan tidak ditemukan", 404);
      }
      if (result.error === "FORBIDDEN") {
        throw new AppError("FORBIDDEN", "Akses ditolak: Laporan ini bukan ditujukan ke pos pelayanan Anda", 403);
      }
      if (result.error === "INVALID_STATUS") {
        throw new AppError(
          "INVALID_STATUS_TRANSITION",
          `Hanya laporan berstatus PENDING_RECEIPT yang dapat ditolak (status saat ini: ${result.currentStatus})`,
          409
        );
      }
    }

    return submissionsService.mapToSubmissionDto(result.submission);
  }
}

export const officerSubmissionsService = new OfficerSubmissionsService();
