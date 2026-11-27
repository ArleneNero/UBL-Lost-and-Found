import { officerInventoryService } from "./officer-inventory.service.js";
import { officerSubmissionsService } from "./officer-submissions.service.js";
import { officerDispositionService } from "./officer-disposition.service.js";
import { mapToOfficerDto } from "./officer.mapper.js";
import type {
  ItemCreateRequest,
  InventoryOfficerDto,
  ReceiveRequest,
  ReturnRequest,
} from "./officer.dto.js";
import type { OfficerContext } from "../auth/auth.types.js";
import type { ReportStatus } from "../submissions/submissions.dto.js";

export { officerInventoryService, officerSubmissionsService, officerDispositionService };

/**
 * Facade officer service delegating to specialized services
 */
export class OfficerService {
  registerFoundItem(context: OfficerContext, request: ItemCreateRequest) {
    return officerInventoryService.registerFoundItem(context, request);
  }

  getSubmissions(
    context: OfficerContext,
    params: { status?: ReportStatus; page?: number; limit?: number }
  ) {
    return officerSubmissionsService.getSubmissions(context, params);
  }

  receiveSubmission(
    context: OfficerContext,
    submissionId: string,
    request: ReceiveRequest
  ) {
    return officerSubmissionsService.receiveSubmission(context, submissionId, request);
  }

  rejectSubmission(context: OfficerContext, submissionId: string, reason: string) {
    return officerSubmissionsService.rejectSubmission(context, submissionId, reason);
  }

  getInventory(
    context: OfficerContext,
    params: {
      status?: "STORED" | "RETURNED_TO_OWNER" | "DISTRIBUTED";
      category?: string;
      q?: string;
      sort?: "received_at_asc" | "received_at_desc";
      page?: number;
      limit?: number;
      includeArchived?: boolean;
      archivedOnly?: boolean;
    }
  ) {
    return officerInventoryService.getInventory(context, params);
  }

  getItemDetail(context: OfficerContext, itemId: string) {
    return officerInventoryService.getItemDetail(context, itemId);
  }

  updateVisibility(context: OfficerContext, itemId: string, isVisible: boolean) {
    return officerInventoryService.updateVisibility(context, itemId, isVisible);
  }

  returnItem(context: OfficerContext, itemId: string, request: ReturnRequest) {
    return officerDispositionService.returnItem(context, itemId, request);
  }

  distributeItem(context: OfficerContext, itemId: string, notes?: string | null) {
    return officerDispositionService.distributeItem(context, itemId, notes);
  }

  getOverdue(context: OfficerContext) {
    return officerInventoryService.getOverdue(context);
  }

  mapToOfficerDto(
    item: Parameters<typeof mapToOfficerDto>[0],
    photo: Parameters<typeof mapToOfficerDto>[1],
    context: OfficerContext,
    returnRecord?: Parameters<typeof mapToOfficerDto>[3]
  ): InventoryOfficerDto {
    return mapToOfficerDto(item, photo, context, returnRecord);
  }
}

export const officerService = new OfficerService();
