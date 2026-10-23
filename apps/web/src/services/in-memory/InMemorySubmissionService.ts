import {
  ISubmissionService,
  GetSubmissionsParams,
  CreateSubmissionInput,
  ReceiveSubmissionInput,
} from '../contracts/ISubmissionService';
import { Submission, FoundItem, PaginatedResult } from '@/types/domain';
import { mapSubmissionDtoToDomain, mapItemDtoToDomain } from '@/types/domain/mappers';
import { mockStore } from '@/data/mockStore';
import { FoundSubmissionDto, InventoryOfficerDto } from '@/types/api';

export class InMemorySubmissionService implements ISubmissionService {
  async getSubmissions(
    params?: GetSubmissionsParams
  ): Promise<PaginatedResult<Submission>> {
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const status = params?.status;

    let list = [...mockStore.getState().submissions];
    if (status) list = list.filter((s) => s.status === status);

    const total = list.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paginated = list.slice(start, start + limit);

    return {
      items: paginated.map(mapSubmissionDtoToDomain),
      page,
      limit,
      total,
      totalPages,
    };
  }

  async getSubmissionById(id: string): Promise<Submission | null> {
    const sub = mockStore.getState().submissions.find((s) => s.submission_id === id);
    return sub ? mapSubmissionDtoToDomain(sub) : null;
  }

  async createSubmission(input: CreateSubmissionInput): Promise<Submission> {
    const count = mockStore.getState().submissions.length + 1;
    const reportCode = `REP-2026-${String(count).padStart(4, '0')}`;

    const newSub: FoundSubmissionDto = {
      submission_id: `sub-${Date.now()}`,
      report_code: reportCode,
      target_post_id: input.targetPostId,
      item_name: input.itemName,
      category: input.category,
      public_description: input.description,
      found_location: input.foundLocation,
      found_on: input.foundDate,
      status: 'PENDING_RECEIPT',
      submitted_at: new Date().toISOString(),
      report_photo_url: '/assets/branding/Logo_LostnFound.png',
      report_photo_expires_at: '2026-12-31T23:59:59Z',
    };

    mockStore.getState().submissions.unshift(newSub);
    return mapSubmissionDtoToDomain(newSub);
  }

  async receiveSubmission(
    id: string,
    input: ReceiveSubmissionInput
  ): Promise<FoundItem> {
    const sub = mockStore.getState().submissions.find((s) => s.submission_id === id);
    if (!sub) throw new Error('Laporan tidak ditemukan');
    if (sub.status !== 'PENDING_RECEIPT') {
      throw new Error(`Laporan tidak dapat diterima karena berstatus ${sub.status}`);
    }
    if (!input.photoToken) {
      throw new Error('Foto inventaris wajib disertakan');
    }

    sub.status = 'RECEIVED';

    const count = mockStore.getState().items.length + 1;
    const invCode = `INV-2026-${String(count).padStart(4, '0')}`;

    const newItem: InventoryOfficerDto = {
      item_id: `item-sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      inventory_code: invCode,
      item_name: sub.item_name,
      category: sub.category,
      public_description: input.publicDescription || sub.public_description,
      found_location: sub.found_location,
      found_on: sub.found_on,
      received_at: new Date().toISOString(),
      storage_post_id: sub.target_post_id,
      post: { post_id: sub.target_post_id, name: 'Pos Pengajaran' },
      status: 'STORED',
      is_visible: true,
      source_submission_id: sub.submission_id,
      private_verification_notes: input.privateNotes || null,
      photos: [
        {
          photo_id: `photo-${Date.now()}`,
          url: sub.report_photo_url,
          expires_at: '2026-12-31T23:59:59Z',
          is_primary: true,
        },
      ],
    };

    mockStore.getState().items.unshift(newItem);
    return mapItemDtoToDomain(newItem);
  }

  async rejectSubmission(id: string, reason: string): Promise<Submission> {
    const sub = mockStore.getState().submissions.find((s) => s.submission_id === id);
    if (!sub) throw new Error('Laporan tidak ditemukan');
    if (sub.status !== 'PENDING_RECEIPT') {
      throw new Error(`Laporan tidak dapat ditolak karena berstatus ${sub.status}`);
    }
    const trimmed = reason.trim();
    if (!trimmed) {
      throw new Error('Alasan penolakan wajib diisi');
    }

    sub.status = 'REJECTED';
    sub.public_description = `[DITOLAK] Alasan: ${trimmed} | ${sub.public_description}`;
    return mapSubmissionDtoToDomain(sub);
  }
}
