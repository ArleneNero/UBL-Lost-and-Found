import {
  IItemService,
  GetItemsParams,
  GetOfficerItemsParams,
  CreateItemInput,
} from '../contracts/IItemService';
import { FoundItem, PaginatedResult } from '@/types/domain';
import { mapItemDtoToDomain } from '@/types/domain/mappers';
import {
  ApiListResponse,
  ApiDataResponse,
  FoundItemPublicDto,
  InventoryOfficerDto,
  ItemCreateRequestDto,
} from '@/types/api';
import { apiClient, ApiError } from './apiClient';

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
   * F/E.2.1: Hubungkan detail ke Fastify GET /api/v1/items/:id
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

  async getItemById(id: string): Promise<FoundItem | null> {
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

  async getOfficerItems(params?: GetOfficerItemsParams): Promise<PaginatedResult<FoundItem>> {
    return this.getItems(params);
  }

  async updateVisibility(_id: string, _isVisible: boolean): Promise<FoundItem> {
    throw new Error('Operasi updateVisibility dijadwalkan pada Milestone B/G');
  }

  async returnItem(_id: string, _recipientName: string, _summary: string): Promise<FoundItem> {
    throw new Error('Operasi returnItem dijadwalkan pada Milestone B/J');
  }

  async distributeItem(_id: string, _notes: string): Promise<FoundItem> {
    throw new Error('Operasi distributeItem dijadwalkan pada Milestone B/J');
  }
}
