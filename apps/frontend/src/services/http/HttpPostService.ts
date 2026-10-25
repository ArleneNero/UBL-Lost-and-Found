import { IPostService } from '../contracts/IPostService';
import { ServicePost } from '@/types/domain';
import { mapServicePostDtoToDomain } from '@/types/domain/mappers';
import {
  ApiListResponse,
  ApiDataResponse,
  ServicePostPublicDto,
} from '@/types/api';
import { apiClient, ApiError } from './apiClient';

/**
 * F/E.2.2: Hubungkan pos pelayanan ke Fastify GET /api/v1/posts
 */
export class HttpPostService implements IPostService {
  async getPosts(): Promise<ServicePost[]> {
    try {
      const res = await apiClient<ApiListResponse<ServicePostPublicDto>>('/posts');
      return res.data.map(mapServicePostDtoToDomain);
    } catch {
      return [];
    }
  }

  async getPostById(id: number): Promise<ServicePost | null> {
    try {
      const res = await apiClient<ApiDataResponse<ServicePostPublicDto>>(`/posts/${id}`);
      return mapServicePostDtoToDomain(res.data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        return null;
      }
      return null;
    }
  }
}
