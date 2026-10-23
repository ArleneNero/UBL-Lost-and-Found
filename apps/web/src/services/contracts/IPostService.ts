import { ServicePost } from '@/types/domain';

export interface IPostService {
  getPosts(): Promise<ServicePost[]>;
  getPostById(id: number): Promise<ServicePost | null>;
}
