import { submissionsRepository } from "./submissions.repository.js";
import { uploadsService } from "../uploads/uploads.service.js";
import { resolvePhotoUrl } from "../../utils/photoResolver.js";
import { AppError } from "../../utils/errors.js";
import { db } from "../../db/index.js";
import { servicePosts, foundSubmissions } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import type {
  SubmissionCreateRequest,
  FoundSubmissionDto,
  ReportWithHistoryDto,
  ReportStatus,
} from "./submissions.dto.js";
import type { AuthUser } from "../auth/auth.types.js";

type SubmissionRow = typeof foundSubmissions.$inferSelect;

export class SubmissionsService {
  /**
   * B/H.1.1: Creates student report, consumes REPORT_PHOTO token and initializes status
   */
  async createSubmission(
    user: AuthUser,
    request: SubmissionCreateRequest
  ): Promise<FoundSubmissionDto> {
    // 1. Verify target post exists
    const post = await db.query.servicePosts.findFirst({
      where: eq(servicePosts.postId, request.target_post_id),
    });

    if (!post) {
      throw new AppError("INVALID_TARGET_POST", "Pos pelayanan tujuan tidak ditemukan", 422);
    }

    // 2. Verify and consume upload token (bound to student & purpose REPORT_PHOTO)
    const { storagePath } = await uploadsService.verifyAndConsumeUploadToken(
      request.report_photo_upload_token,
      "REPORT_PHOTO",
      user.userId
    );

    // 3. Insert report and initial status history in a transaction
    const { submission } = await submissionsRepository.insertSubmissionWithHistory({
      request,
      reporterUserId: user.userId,
      storagePath,
    });

    return this.mapToSubmissionDto(submission);
  }

  /**
   * B/H.1.2: Lists reports submitted by current student
   */
  async getReporterSubmissions(
    user: AuthUser,
    params: { status?: ReportStatus; page?: number; limit?: number }
  ) {
    const result = await submissionsRepository.getSubmissionsByReporter({
      reporterUserId: user.userId,
      status: params.status,
      page: params.page,
      limit: params.limit,
    });

    return {
      data: result.items.map((item) => this.mapToSubmissionDto(item)),
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        total_pages: result.totalPages,
      },
    };
  }

  /**
   * B/H.2.0: Get submission details and full audit history
   * Allowed for: reporter student OR assigned officer of target post
   */
  async getSubmissionDetail(
    submissionId: string,
    user: AuthUser,
    officerPostId?: number
  ): Promise<ReportWithHistoryDto> {
    const data = await submissionsRepository.getSubmissionWithHistory(submissionId);

    if (!data) {
      throw new AppError("NOT_FOUND", "Laporan temuan tidak ditemukan", 404);
    }

    const { submission, history } = data;

    // Authorization check
    const isOwner = submission.reporterUserId === user.userId;
    const isAssignedOfficer = user.role === "OFFICER" && officerPostId === submission.targetPostId;

    if (!isOwner && !isAssignedOfficer) {
      throw new AppError("FORBIDDEN", "Akses ditolak: Anda tidak memiliki akses ke laporan ini", 403);
    }

    const baseDto = this.mapToSubmissionDto(submission);

    return {
      ...baseDto,
      history: history.map((h) => ({
        history_id: h.historyId,
        from_status: h.fromStatus,
        to_status: h.toStatus,
        reason: h.reason ?? null,
        changed_at:
          h.changedAt instanceof Date
            ? h.changedAt.toISOString()
            : new Date(h.changedAt).toISOString(),
      })),
    };
  }

  /**
   * B/H.2.1: Cancels pending report by owner student
   */
  async cancelSubmission(
    submissionId: string,
    user: AuthUser,
    reason: string
  ): Promise<FoundSubmissionDto> {
    const result = await submissionsRepository.cancelSubmission(submissionId, user.userId, reason);

    if (!result.success) {
      if (result.error === "NOT_FOUND") {
        throw new AppError("NOT_FOUND", "Laporan temuan tidak ditemukan", 404);
      }
      if (result.error === "FORBIDDEN") {
        throw new AppError("FORBIDDEN", "Akses ditolak: Hanya pemilik yang dapat membatalkan laporan", 403);
      }
      if (result.error === "INVALID_STATUS") {
        throw new AppError(
          "INVALID_STATUS_TRANSITION",
          `Hanya laporan berstatus PENDING_RECEIPT yang dapat dibatalkan (status saat ini: ${result.currentStatus})`,
          409
        );
      }
    }

    return this.mapToSubmissionDto(result.submission);
  }

  public mapToSubmissionDto(submission: SubmissionRow): FoundSubmissionDto {
    const resolved = resolvePhotoUrl(submission.reportPhotoPath);

    return {
      submission_id: submission.submissionId,
      report_code: submission.reportCode,
      target_post_id: submission.targetPostId,
      item_name: submission.itemName,
      category: submission.category,
      public_description: submission.publicDescription,
      found_location: submission.foundLocation,
      found_on: String(submission.foundOn).split("T")[0],
      status: submission.status,
      submitted_at:
        submission.submittedAt instanceof Date
          ? submission.submittedAt.toISOString()
          : new Date(submission.submittedAt).toISOString(),
      report_photo_url: resolved.url,
      report_photo_expires_at: resolved.expires_at,
    };
  }
}

export const submissionsService = new SubmissionsService();
