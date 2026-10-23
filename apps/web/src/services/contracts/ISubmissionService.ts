import { Submission, FoundItem, PaginatedResult } from '@/types/domain';
import { ReportStatus } from '@/types/api';

export interface GetSubmissionsParams {
  targetPostId?: number;
  status?: ReportStatus;
  page?: number;
  limit?: number;
}

export interface CreateSubmissionInput {
  targetPostId: number;
  itemName: string;
  category: string;
  description: string;
  foundLocation: string;
  foundDate: string;
  photoToken: string;
}

export interface ReceiveSubmissionInput {
  publicDescription: string;
  privateNotes?: string;
  photoToken: string;
}

export interface ISubmissionService {
  getSubmissions(params?: GetSubmissionsParams): Promise<PaginatedResult<Submission>>;
  getSubmissionById(id: string): Promise<Submission | null>;
  createSubmission(input: CreateSubmissionInput): Promise<Submission>;
  receiveSubmission(id: string, input: ReceiveSubmissionInput): Promise<FoundItem>;
  rejectSubmission(id: string, reason: string): Promise<Submission>;
}
