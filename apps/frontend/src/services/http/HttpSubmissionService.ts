import {
  ISubmissionService,
  GetSubmissionsParams,
  CreateSubmissionInput,
  ReceiveSubmissionInput,
} from '../contracts/ISubmissionService';
import { Submission, FoundItem, PaginatedResult } from '@/types/domain';
import { mapSubmissionDtoToDomain, mapItemDtoToDomain } from '@/types/domain/mappers';
import {
  ApiListResponse,
  ApiDataResponse,
  FoundSubmissionDto,
  InventoryOfficerDto,
} from '@/types/api';
import { apiClient, ApiError } from './apiClient';
import { mockStore } from '@/data/mockStore';

export class HttpSubmissionService implements ISubmissionService {
  /**
   * Mengambil daftar laporan temuan:
   * - Mahasiswa: GET /submissions/me
   * - Petugas: GET /officer/submissions
   */
  async getSubmissions(
    params?: GetSubmissionsParams
  ): Promise<PaginatedResult<Submission>> {
    const isOfficer = mockStore.getState().currentUser?.role === 'OFFICER';
    const basePath = isOfficer ? '/officer/submissions' : '/submissions/me';

    const qp = new URLSearchParams();
    if (params?.page) qp.set('page', String(params.page));
    if (params?.limit) qp.set('limit', String(Math.min(params.limit, 10)));
    if (params?.status) qp.set('status', params.status);

    const qs = qp.toString();
    const endpoint = `${basePath}${qs ? `?${qs}` : ''}`;
    const res = await apiClient<ApiListResponse<FoundSubmissionDto>>(endpoint);

    return {
      items: res.data.map(mapSubmissionDtoToDomain),
      total: res.meta.total,
      totalPages: res.meta.total_pages,
      page: res.meta.page,
      limit: res.meta.limit,
    };
  }

  /**
   * Detail laporan: GET /submissions/:id
   */
  async getSubmissionById(id: string): Promise<Submission | null> {
    try {
      const res = await apiClient<ApiDataResponse<FoundSubmissionDto>>(`/submissions/${id}`);
      return mapSubmissionDtoToDomain(res.data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        return null;
      }
      throw err;
    }
  }

  /**
   * Mahasiswa membuat laporan: POST /submissions
   */
  async createSubmission(input: CreateSubmissionInput): Promise<Submission> {
    const payload = {
      target_post_id: input.targetPostId,
      item_name: input.itemName,
      category: input.category,
      public_description: input.description,
      found_location: input.foundLocation,
      found_on: input.foundDate,
      report_photo_upload_token: input.photoToken,
    };

    const res = await apiClient<ApiDataResponse<FoundSubmissionDto>>('/submissions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return mapSubmissionDtoToDomain(res.data);
  }

  /**
   * Petugas menerima fisik barang temuan: POST /officer/submissions/:id/receive
   */
  async receiveSubmission(
    id: string,
    input: ReceiveSubmissionInput
  ): Promise<FoundItem> {
    const trimmedToken = input.photoToken?.trim();
    const payload: Record<string, unknown> = {
      public_description: input.publicDescription,
      private_verification_notes: input.privateNotes || null,
    };
    if (trimmedToken) {
      payload.item_photo_upload_tokens = [trimmedToken];
    }

    const res = await apiClient<ApiDataResponse<InventoryOfficerDto>>(
      `/officer/submissions/${id}/receive`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );

    return mapItemDtoToDomain(res.data);
  }

  /**
   * Petugas menolak laporan: POST /officer/submissions/:id/reject
   */
  async rejectSubmission(id: string, reason: string): Promise<Submission> {
    const res = await apiClient<ApiDataResponse<FoundSubmissionDto>>(
      `/officer/submissions/${id}/reject`,
      {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim() }),
      }
    );

    return mapSubmissionDtoToDomain(res.data);
  }

  /**
   * Mahasiswa membatalkan laporan mandiri: POST /submissions/:id/cancel
   */
  async cancelSubmission(id: string, reason: string): Promise<Submission> {
    const res = await apiClient<ApiDataResponse<FoundSubmissionDto>>(
      `/submissions/${id}/cancel`,
      {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim() }),
      }
    );

    return mapSubmissionDtoToDomain(res.data);
  }
}
