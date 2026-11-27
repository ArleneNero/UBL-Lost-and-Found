import { db, type DbTransaction } from "../../db/index.js";
import {
  foundItems,
  itemPhotos,
  foundSubmissions,
  submissionStatusHistory,
  servicePosts,
} from "../../db/schema.js";
import { generateInventoryCode } from "./inventory-code.util.js";
import type { ReportStatus } from "../submissions/submissions.dto.js";
import { eq, and, sql, desc } from "drizzle-orm";

export interface ReceiveSubmissionParams {
  submissionId: string;
  officerUserId: string;
  storagePostId: number;
  publicDescription: string;
  privateVerificationNotes?: string | null;
  storagePath?: string;
}

type SubmissionRow = typeof foundSubmissions.$inferSelect;

type LockedSubmissionResult =
  | { success: true; submission: SubmissionRow }
  | { success: false; error: "NOT_FOUND" | "FORBIDDEN" }
  | { success: false; error: "INVALID_STATUS"; currentStatus: ReportStatus };

function validateSubmissionForPost(
  submission: SubmissionRow | undefined,
  storagePostId: number
): LockedSubmissionResult {
  if (!submission) {
    return { success: false, error: "NOT_FOUND" };
  }
  if (submission.targetPostId !== storagePostId) {
    return { success: false, error: "FORBIDDEN" };
  }
  if (submission.status !== "PENDING_RECEIPT") {
    return { success: false, error: "INVALID_STATUS", currentStatus: submission.status };
  }
  return { success: true, submission };
}

async function lockPendingSubmissionForUpdate(
  tx: DbTransaction,
  submissionId: string,
  storagePostId: number
): Promise<LockedSubmissionResult> {
  const [submission] = await tx
    .select()
    .from(foundSubmissions)
    .where(eq(foundSubmissions.submissionId, submissionId))
    .for("update");

  return validateSubmissionForPost(submission, storagePostId);
}

export class OfficerSubmissionsRepository {
  /**
   * B/I.1.0: List submissions targeting this officer's post
   */
  async getSubmissionsByPost(
    postId: number,
    params: { status?: ReportStatus; page?: number; limit?: number }
  ) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const offset = (page - 1) * limit;

    const conditions = [eq(foundSubmissions.targetPostId, postId)];
    if (params.status) {
      conditions.push(eq(foundSubmissions.status, params.status));
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
   * FIND-27: Pre-check submission eligibility before consuming single-use upload token
   */
  async checkSubmissionReceiveEligibility(submissionId: string, storagePostId: number) {
    const submission = await db.query.foundSubmissions.findFirst({
      where: eq(foundSubmissions.submissionId, submissionId),
    });

    const validation = validateSubmissionForPost(submission, storagePostId);
    if (!validation.success) {
      if (validation.error === "INVALID_STATUS") {
        return {
          eligible: false as const,
          error: "INVALID_STATUS" as const,
          currentStatus: validation.currentStatus,
        };
      }
      return { eligible: false as const, error: validation.error };
    }

    return {
      eligible: true as const,
      hasReportPhoto: Boolean(validation.submission.reportPhotoPath?.trim()),
    };
  }

  /**
   * B/I.1.1 & B/I.1.2: Atomically receives physical item, sets submission to RECEIVED, and creates inventory item
   */
  async receiveSubmission(params: ReceiveSubmissionParams) {
    const {
      submissionId,
      officerUserId,
      storagePostId,
      publicDescription,
      privateVerificationNotes,
      storagePath,
    } = params;

    return await db.transaction(async (tx) => {
      const lockResult = await lockPendingSubmissionForUpdate(tx, submissionId, storagePostId);
      if (!lockResult.success) {
        return lockResult;
      }

      const { submission } = lockResult;
      const resolvedPhotoPath = (storagePath && storagePath.trim()) || submission.reportPhotoPath;
      if (!resolvedPhotoPath || !resolvedPhotoPath.trim()) {
        return { success: false as const, error: "MISSING_PHOTO" as const };
      }

      // 1. Update submission status to RECEIVED with atomic status precondition
      const [updatedSubmission] = await tx
        .update(foundSubmissions)
        .set({ status: "RECEIVED" })
        .where(
          and(
            eq(foundSubmissions.submissionId, submissionId),
            eq(foundSubmissions.targetPostId, storagePostId),
            eq(foundSubmissions.status, "PENDING_RECEIPT")
          )
        )
        .returning();

      if (!updatedSubmission) {
        const [latest] = await tx
          .select({ status: foundSubmissions.status })
          .from(foundSubmissions)
          .where(eq(foundSubmissions.submissionId, submissionId));
        return {
          success: false as const,
          error: "INVALID_STATUS" as const,
          currentStatus: latest?.status ?? submission.status,
        };
      }

      // 2. Append history
      await tx.insert(submissionStatusHistory).values({
        submissionId,
        changedByUserId: officerUserId,
        fromStatus: "PENDING_RECEIPT",
        toStatus: "RECEIVED",
        reason: "Fisik barang telah diverifikasi dan diterima di pos pelayanan",
      });

      // 3. Snapshot post storage limit and create found_items
      const post = await tx.query.servicePosts.findFirst({
        where: eq(servicePosts.postId, storagePostId),
        columns: { storageLimitDays: true },
      });
      const snapshotLimitDays =
        post?.storageLimitDays && post.storageLimitDays > 0 ? post.storageLimitDays : 365;

      const inventoryCode = await generateInventoryCode(tx);
      const [item] = await tx
        .insert(foundItems)
        .values({
          inventoryCode,
          sourceSubmissionId: submission.submissionId,
          recordedByUserId: officerUserId,
          storagePostId,
          itemName: submission.itemName,
          category: submission.category,
          publicDescription,
          privateVerificationNotes: privateVerificationNotes ?? null,
          foundLocation: submission.foundLocation,
          foundOn: submission.foundOn,
          storageLimitDays: snapshotLimitDays,
          status: "STORED",
          isVisible: true,
        })
        .returning();

      // 4. Create primary item_photos
      const [photo] = await tx
        .insert(itemPhotos)
        .values({
          itemId: item.itemId,
          storagePath: resolvedPhotoPath,
          isPrimary: true,
        })
        .returning();

      return { success: true as const, item, photo };
    });
  }

  /**
   * B/I.2.0: Reject submission
   */
  async rejectSubmission(
    submissionId: string,
    officerUserId: string,
    storagePostId: number,
    reason: string
  ) {
    return await db.transaction(async (tx) => {
      const lockResult = await lockPendingSubmissionForUpdate(tx, submissionId, storagePostId);
      if (!lockResult.success) {
        return lockResult;
      }

      const [updated] = await tx
        .update(foundSubmissions)
        .set({ status: "REJECTED" })
        .where(
          and(
            eq(foundSubmissions.submissionId, submissionId),
            eq(foundSubmissions.targetPostId, storagePostId),
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
          currentStatus: latest?.status ?? lockResult.submission.status,
        };
      }

      await tx.insert(submissionStatusHistory).values({
        submissionId,
        changedByUserId: officerUserId,
        fromStatus: "PENDING_RECEIPT",
        toStatus: "REJECTED",
        reason,
      });

      return { success: true as const, submission: updated };
    });
  }
}

export const officerSubmissionsRepository = new OfficerSubmissionsRepository();
