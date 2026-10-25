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
} from '@/types/api';
import { apiClient, ApiError } from './apiClient';

export class HttpItemService implements IItemService {
  /**
   * F/E.2.0: Hubungkan CatalogPage ke Fastify GET /api/v1/items
   */
  async getItems(params?: GetItemsParams): Promise<PaginatedResult<FoundItem>> {
    const qp = new URLSearchParams();
    if (params?.page) qp.set('page', String(params.page));
    if (params?.limit) qp.set('limit', String(params.limit));
    if (params?.search) qp.set('search', params.search);
    if (params?.category && params.category !== 'ALL') qp.set('category', params.category);
    if (params?.postId) qp.set('post_id', String(params.postId));
    if (params?.sort) qp.set('sort', params.sort);

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

  async createItem(_input: CreateItemInput): Promise<FoundItem> {
    throw new Error('Operasi createItem diimplementasikan pada F/F.3.1');
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