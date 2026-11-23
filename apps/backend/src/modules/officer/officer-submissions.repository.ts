import { db } from "../../db/index.js";
import {
  foundItems,
  itemPhotos,
  foundSubmissions,
  submissionStatusHistory,
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
      const submission = await tx.query.foundSubmissions.findFirst({
        where: eq(foundSubmissions.submissionId, submissionId),
      });

      if (!submission) {
        return { success: false as const, error: "NOT_FOUND" as const };
      }

      if (submission.targetPostId !== storagePostId) {
        return { success: false as const, error: "FORBIDDEN" as const };
      }

      if (submission.status !== "PENDING_RECEIPT") {
        return {
          success: false as const,
          error: "INVALID_STATUS" as const,
          currentStatus: submission.status,
        };
      }

      const resolvedPhotoPath = (storagePath && storagePath.trim()) || submission.reportPhotoPath;
      if (!resolvedPhotoPath || !resolvedPhotoPath.trim()) {
        return { success: false as const, error: "MISSING_PHOTO" as const };
      }

      // 1. Update submission status to RECEIVED
      await tx
        .update(foundSubmissions)
        .set({ status: "RECEIVED" })
        .where(eq(foundSubmissions.submissionId, submissionId));

      // 2. Append history
      await tx.insert(submissionStatusHistory).values({
        submissionId,
        changedByUserId: officerUserId,
        fromStatus: "PENDING_RECEIPT",
        toStatus: "RECEIVED",
        reason: "Fisik barang telah diverifikasi dan diterima di pos pelayanan",
      });

      // 3. Create found_items
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
      const submission = await tx.query.foundSubmissions.findFirst({
        where: eq(foundSubmissions.submissionId, submissionId),
      });

      if (!submission) {
        return { success: false as const, error: "NOT_FOUND" as const };
      }

      if (submission.targetPostId !== storagePostId) {
        return { success: false as const, error: "FORBIDDEN" as const };
      }

      if (submission.status !== "PENDING_RECEIPT") {
        return {
          success: false as const,
          error: "INVALID_STATUS" as const,
          currentStatus: submission.status,
        };
      }

      const [updated] = await tx
        .update(foundSubmissions)
        .set({ status: "REJECTED" })
        .where(eq(foundSubmissions.submissionId, submissionId))
        .returning();

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
