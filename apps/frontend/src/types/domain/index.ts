import { ItemStatus, ReportStatus, UserRole } from '../api';

export interface ItemReturnRecord {
  returnId: string;
  recipientName: string;
  recipientIdentifier?: string | null;
  verificationSummary: string;
  returnedAt: string;
  returnedByName?: string | null;
}

export interface FoundItem {
  id: string;
  inventoryCode: string;
  name: string;
  category: string;
  description: string;
  foundLocation: string;
  foundDate: string;
  receivedAt: string;
  postId: number;
  postName: string;
  photoUrl: string;
  status: ItemStatus;
  isVisible: boolean;
  privateNotes?: string | null;
  storageLimitDays?: number | null;
  archivedAt?: string | null;
  returnRecord?: ItemReturnRecord | null;
}

export interface CleanInventoryResult {
  archivedCount: number;
}

export interface PostSettings {
  postId: number;
  name: string;
  storageLimitDays: number;
}

export interface Submission {
  id: string;
  reportCode: string;
  targetPostId: number;
  itemName: string;
  category: string;
  description: string;
  foundLocation: string;
  foundDate: string;
  status: ReportStatus;
  submittedAt: string;
  photoUrl: string;
}

export interface ServicePost {
  id: number;
  name: string;
  location: string;
  openingHours: string;
  directions: string;
  photos: string[];
}

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  assignedPostId?: number | null;
  studentNumber?: string | null;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
