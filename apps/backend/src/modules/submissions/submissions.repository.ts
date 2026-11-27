import { db } from "../../db/index.js";
import { foundSubmissions, submissionStatusHistory } from "../../db/schema.js";
import { generateReportCode } from "./report-code.util.js";
import type { SubmissionCreateRequest, ReportStatus } from "./submissions.dto.js";
import { eq, and, sql, desc, asc } from "drizzle-orm";

export interface CreateSubmissionParams {
  request: SubmissionCreateRequest;
  reporterUserId: string;
  storagePath: string;
}

export interface GetReporterSubmissionsParams {
  reporterUserId: string;
  status?: ReportStatus;
  page?: number;
  limit?: number;
}

export class SubmissionsRepository {
  /**
   * B/H.1.1: Executes atomic insertion of report and initial status history within a single transaction
   */
  async insertSubmissionWithHistory(params: CreateSubmissionParams) {
    const { request, reporterUserId, storagePath } = params;

    return await db.transaction(async (tx) => {
      const reportCode = await generateReportCode(tx);

      const [submission] = await tx
        .insert(foundSubmissions)
        .values({
          reportCode,
          reporterUserId,
          targetPostId: request.target_post_id,
          itemName: request.item_name,
          category: request.category,
          publicDescription: request.public_description,
          foundLocation: request.found_location,
          foundOn: request.found_on,
          reportPhotoPath: storagePath,
          status: "PENDING_RECEIPT",
        })
        .returning();

      const [history] = await tx
        .insert(submissionStatusHistory)
        .values({
          submissionId: submission.submissionId,
          changedByUserId: reporterUserId,
          fromStatus: null,
          toStatus: "PENDING_RECEIPT",
          reason: "Laporan awal dibuat oleh pelapor",
        })
        .returning();

      return { submission, history };
    });
  }

  /**
   * B/H.1.2: Lists reports owned strictly by the authenticated student
   */
  async getSubmissionsByReporter(params: GetReporterSubmissionsParams) {
    const { reporterUserId, status } = params;
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const offset = (page - 1) * limit;

    const conditions = [eq(foundSubmissions.reporterUserId, reporterUserId)];
    if (status) {
      conditions.push(eq(foundSubmissions.status, status));
    }
    const whereClause = and(...conditions);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(foundSubmissions)
      .where(whereClause);

    const total = countResult?.count || 0;
    const totalPages = Math.ceil(total / limit) || 1;

    const items = await db.query.foundSubmissions.findMany({
      where: whereClause,
      orderBy: [desc(foundSubmissions.submittedAt)],
      limit,
      offset,
    });

    return { items, total, page, limit, totalPages };
  }

  /**
   * B/H.2.0: Fetches submission and its entire immutable status audit history
   */
  async getSubmissionWithHistory(submissionId: string) {
    const submission = await db.query.foundSubmissions.findFirst({
      where: eq(foundSubmissions.submissionId, submissionId),
    });

    if (!submission) {
      return null;
    }

    const history = await db.query.submissionStatusHistory.findMany({
      where: eq(submissionStatusHistory.submissionId, submissionId),
      orderBy: [asc(submissionStatusHistory.changedAt)],
    });

    return { submission, history };
  }

  /**
   * B/H.2.1: Atomically cancels report only if currently in PENDING_RECEIPT
   */
  async cancelSubmission(submissionId: string, reporterUserId: string, reason: string) {
    return await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(foundSubmissions)
        .where(eq(foundSubmissions.submissionId, submissionId))
        .for("update");

      if (!existing) {
        return { success: false as const, error: "NOT_FOUND" as const };
      }

      if (existing.reporterUserId !== reporterUserId) {
        return { success: false as const, error: "FORBIDDEN" as const };
      }

      if (existing.status !== "PENDING_RECEIPT") {
        return {
          success: false as const,
          error: "INVALID_STATUS" as const,
          currentStatus: existing.status,
        };
      }

      const [updated] = await tx
        .update(foundSubmissions)
        .set({
          status: "CANCELLED",
        })
        .where(
          and(
            eq(foundSubmissions.submissionId, submissionId),
            eq(foundSubmissions.reporterUserId, reporterUserId),
            eq(foundSubmissions.status, "PENDING_RECEIPT")
          )
        )
        .returning();

      if (!updated) {
        const [latest] = await tx
          .select({ status: foundSubmissions.status })
          .from(foundSubmissions)
          .where(eq(foundSubmissions.submissionId, submissionId));
        return {
          success: false as const,
          error: "INVALID_STATUS" as const,
          currentStatus: latest?.status ?? existing.status,
        };
      }

      await tx.insert(submissionStatusHistory).values({
        submissionId,
        changedByUserId: reporterUserId,
        fromStatus: "PENDING_RECEIPT",
        toStatus: "CANCELLED",
        reason,
      });

      return { success: true as const, submission: updated };
    });
  }
}

export const submissionsRepository = new SubmissionsRepository();
