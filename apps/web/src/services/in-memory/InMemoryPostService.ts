import { IPostService } from '../contracts/IPostService';
import { ServicePost } from '@/types/domain';
import { mapServicePostDtoToDomain } from '@/types/domain/mappers';
import { mockStore } from '@/data/mockStore';

export class InMemoryPostService implements IPostService {
  async getPosts(): Promise<ServicePost[]> {
    return mockStore.getState().posts.map(mapServicePostDtoToDomain);
  }

  async getPostById(id: number): Promise<ServicePost | null> {
    const post = mockStore.getState().posts.find((p) => p.post_id === id);
    return post ? mapServicePostDtoToDomain(post) : null;
  }
}
