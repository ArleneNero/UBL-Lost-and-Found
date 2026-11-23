import {
  IItemService,
  GetItemsParams,
  GetOfficerItemsParams,
  CreateItemInput,
} from '../contracts/IItemService';
import { FoundItem, PaginatedResult, PostSettings, CleanInventoryResult } from '@/types/domain';
import { mapItemDtoToDomain } from '@/types/domain/mappers';
import {
  ApiListResponse,
  ApiDataResponse,
  FoundItemPublicDto,
  InventoryOfficerDto,
  ItemCreateRequestDto,
  PostSettingsDto,
  CleanInventoryResponseDto,
  ReturnRequestDto,
} from '@/types/api';
import { apiClient, ApiError } from './apiClient';
import { mockStore } from '@/data/mockStore';

export class HttpItemService implements IItemService {
  /**
   * F/E.2.0: Hubungkan CatalogPage ke Fastify GET /api/v1/items
   */
  async getItems(params?: GetItemsParams): Promise<PaginatedResult<FoundItem>> {
    const qp = new URLSearchParams();
    if (params?.page) qp.set('page', String(params.page));
    qp.set('limit', String(params?.limit ? Math.min(params.limit, 10) : 8));
    if (params?.search) qp.set('q', params.search);
    if (params?.category && params.category !== 'ALL') qp.set('category', params.category);
    if (params?.postId) qp.set('post_id', String(params.postId));
    const sortVal = params?.sort === 'oldest' ? 'received_at_asc' : 'received_at_desc';
    qp.set('sort', sortVal);

    const qs = qp.toString();
    const endpoint = `/items${qs ? `?${qs}` : ''}`;
    const res = await apiClient<ApiListResponse<FoundItemPublicDto>>(endpoint);

    return {
      items: res.data.map(mapItemDtoToDomain),
      total: res.meta.total,
      totalPages: res.meta.total_pages,
      page: res.meta.page,
      limit: res.meta.limit,
    };
  }

  /**
   * B/G.1.0: Hubungkan daftar inventaris petugas ke Fastify GET /api/v1/officer/inventory
   */
  async getOfficerItems(params?: GetOfficerItemsParams): Promise<PaginatedResult<FoundItem>> {
    const qp = new URLSearchParams();
    if (params?.page) qp.set('page', String(params.page));
    qp.set('limit', String(params?.limit ? Math.min(params.limit, 100) : 10));
    if (params?.search) qp.set('q', params.search);
    if (params?.category && params.category !== 'ALL') qp.set('category', params.category);
    if (params?.status) qp.set('status', params.status);
    if (params?.includeArchived) qp.set('include_archived', 'true');
    if (params?.archivedOnly) qp.set('archived_only', 'true');
    const sortVal = params?.sort === 'oldest' ? 'received_at_asc' : 'received_at_desc';
    qp.set('sort', sortVal);

    const qs = qp.toString();
    const endpoint = `/officer/inventory${qs ? `?${qs}` : ''}`;
    const res = await apiClient<ApiListResponse<InventoryOfficerDto>>(endpoint);

    return {
      items: res.data.map(mapItemDtoToDomain),
      total: res.meta.total,
      totalPages: res.meta.total_pages,
      page: res.meta.page,
      limit: res.meta.limit,
    };
  }

  /**
   * F/E.2.1: Hubungkan detail publik ke Fastify GET /api/v1/items/:id
   */
  async getPublicItemById(id: string): Promise<FoundItem | null> {
    try {
      const res = await apiClient<ApiDataResponse<FoundItemPublicDto>>(`/items/${id}`);
      return mapItemDtoToDomain(res.data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        return null;
      }
      throw err;
    }
  }

  /**
   * B/G.1.1: Hubungkan detail inventaris petugas ke Fastify GET /api/v1/officer/items/:id
   */
  async getOfficerItemById(id: string): Promise<FoundItem | null> {
    try {
      const res = await apiClient<ApiDataResponse<InventoryOfficerDto>>(`/officer/items/${id}`);
      return mapItemDtoToDomain(res.data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        return null;
      }
      throw err;
    }
  }

  async getItemById(id: string): Promise<FoundItem | null> {
    const isOfficer = mockStore.getState().currentUser?.role === 'OFFICER';
    if (isOfficer) {
      return this.getOfficerItemById(id);
    }
    return this.getPublicItemById(id);
  }

  /**
   * F/F.3.1: Integrasi direct item registration POST /api/v1/officer/items
   */
  async createItem(input: CreateItemInput): Promise<FoundItem> {
    const payload: ItemCreateRequestDto = {
      item_name: input.name,
      category: input.category,
      public_description: input.description,
      found_location: input.foundLocation || null,
      found_on: input.foundDate || null,
      private_verification_notes: input.privateNotes || null,
      item_photo_upload_tokens: [input.photoToken],
    };

    const res = await apiClient<ApiDataResponse<InventoryOfficerDto>>(
      '/officer/items',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );

    return mapItemDtoToDomain(res.data);
  }

  /**
   * B/G.1.2: Perbarui visibilitas item inventaris PATCH /api/v1/officer/items/:id/visibility
   */
  async updateVisibility(id: string, isVisible: boolean): Promise<FoundItem> {
    const res = await apiClient<ApiDataResponse<InventoryOfficerDto>>(
      `/officer/items/${id}/visibility`,
      {
        method: 'PATCH',
        body: JSON.stringify({ is_visible: isVisible }),
      }
    );

    return mapItemDtoToDomain(res.data);
  }

  /**
   * B/J.1.0: Serah terima pengembalian ke pemilik POST /api/v1/officer/items/:id/return
   */
  async returnItem(
    id: string,
    recipientName: string,
    verificationSummary: string,
    recipientIdentifier?: string
  ): Promise<FoundItem> {
    const payload: ReturnRequestDto = {
      recipient_name: recipientName.trim(),
      recipient_identifier: recipientIdentifier?.trim() || null,
      verification_summary: verificationSummary.trim(),
    };
    await apiClient<ApiDataResponse<unknown>>(
      `/officer/items/${id}/return`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );

    const refreshed = await this.getOfficerItemById(id);
    if (!refreshed) {
      throw new Error('Barang inventaris tidak ditemukan setelah serah terima');
    }
    return refreshed;
  }

  /**
   * B/J.1.2: Penyaluran barang kedaluwarsa POST /api/v1/officer/items/:id/distribute
   */
  async distributeItem(id: string, _notes: string): Promise<FoundItem> {
    const res = await apiClient<ApiDataResponse<InventoryOfficerDto>>(
      `/officer/items/${id}/distribute`,
      {
        method: 'POST',
      }
    );

    return mapItemDtoToDomain(res.data);
  }

  async getPostSettings(): Promise<PostSettings> {
    const res = await apiClient<ApiDataResponse<PostSettingsDto>>('/officer/post-settings');
    return {
      postId: res.data.post_id,
      name: res.data.name,
      storageLimitDays: res.data.storage_limit_days,
    };
  }

  async updatePostSettings(storageLimitDays: number): Promise<PostSettings> {
    const res = await apiClient<ApiDataResponse<PostSettingsDto>>('/officer/post-settings', {
      method: 'PATCH',
      body: JSON.stringify({ storage_limit_days: storageLimitDays }),
    });
    return {
      postId: res.data.post_id,
      name: res.data.name,
      storageLimitDays: res.data.storage_limit_days,
    };
  }

  async cleanCompletedInventory(month?: string): Promise<CleanInventoryResult> {
    const res = await apiClient<ApiDataResponse<CleanInventoryResponseDto>>(
      '/officer/inventory/clean',
      {
        method: 'POST',
        body: JSON.stringify(month ? { month } : {}),
      }
    );
    return { archivedCount: res.data.archived_count };
  }
}
