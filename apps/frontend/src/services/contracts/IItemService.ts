import { FoundItem, PaginatedResult } from '@/types/domain';
import { ItemStatus } from '@/types/api';

export interface GetItemsParams {
  search?: string;
  category?: string;
  postId?: number;
  sort?: 'newest' | 'oldest';
  page?: number;
  limit?: number;
}

export interface GetOfficerItemsParams extends GetItemsParams {
  status?: ItemStatus;
  isVisible?: boolean;
}

export interface CreateItemInput {
  name: string;
  category: string;
  description: string;
  foundLocation?: string;
  foundDate?: string;
  privateNotes?: string;
  photoToken: string;
}

export interface IItemService {
  getItems(params?: GetItemsParams): Promise<PaginatedResult<FoundItem>>;
  getOfficerItems(params?: GetOfficerItemsParams): Promise<PaginatedResult<FoundItem>>;
  getItemById(id: string): Promise<FoundItem | null>;
  getPublicItemById(id: string): Promise<FoundItem | null>;
  createItem(input: CreateItemInput): Promise<FoundItem>;
  updateVisibility(id: string, isVisible: boolean): Promise<FoundItem>;
  returnItem(id: string, recipientName: string, verificationSummary: string): Promise<FoundItem>;
  distributeItem(id: string, notes: string): Promise<FoundItem>;
}
