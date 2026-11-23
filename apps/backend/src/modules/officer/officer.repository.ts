import {
  officerInventoryRepository,
  CreateItemParams,
  GetOfficerInventoryParams,
} from "./officer-inventory.repository.js";
import {
  officerSubmissionsRepository,
  ReceiveSubmissionParams,
} from "./officer-submissions.repository.js";
import { officerDispositionRepository } from "./officer-disposition.repository.js";
import type { ReportStatus } from "../submissions/submissions.dto.js";

export { CreateItemParams, GetOfficerInventoryParams, ReceiveSubmissionParams };
export { officerInventoryRepository, officerSubmissionsRepository, officerDispositionRepository };

/**
 * Facade repository combining specialized officer repositories
 */
export class OfficerRepository {
  insertItemWithPhoto(params: CreateItemParams) {
    return officerInventoryRepository.insertItemWithPhoto(params);
  }

  getSubmissionsByPost(
    postId: number,
    params: { status?: ReportStatus; page?: number; limit?: number }
  ) {
    return officerSubmissionsRepository.getSubmissionsByPost(postId, params);
  }

  receiveSubmission(params: ReceiveSubmissionParams) {
    return officerSubmissionsRepository.receiveSubmission(params);
  }

  rejectSubmission(
    submissionId: string,
    officerUserId: string,
    storagePostId: number,
    reason: string
  ) {
    return officerSubmissionsRepository.rejectSubmission(
      submissionId,
      officerUserId,
      storagePostId,
      reason
    );
  }

  getInventoryByPost(params: GetOfficerInventoryParams) {
    return officerInventoryRepository.getInventoryByPost(params);
  }

  getItemById(itemId: string, storagePostId: number) {
    return officerInventoryRepository.getItemById(itemId, storagePostId);
  }

  updateItemVisibility(itemId: string, storagePostId: number, isVisible: boolean) {
    return officerInventoryRepository.updateItemVisibility(itemId, storagePostId, isVisible);
  }

  returnItem(params: {
    itemId: string;
    officerUserId: string;
    storagePostId: number;
    recipientName: string;
    recipientIdentifier?: string | null;
    verificationSummary: string;
  }) {
    return officerDispositionRepository.returnItem(params);
  }

  distributeItem(itemId: string, storagePostId: number) {
    return officerDispositionRepository.distributeItem(itemId, storagePostId);
  }

  getOverdueItems(storagePostId: number) {
    return officerInventoryRepository.getOverdueItems(storagePostId);
  }
}

export const officerRepository = new OfficerRepository();
