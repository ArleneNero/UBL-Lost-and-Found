/**
 * OpenAPI v1.0 canonical wire contract schemas
 * Property casing is snake_case as per API contract
 */

export type ItemStatus = 'STORED' | 'RETURNED_TO_OWNER' | 'DISTRIBUTED';
export type ReportStatus = 'PENDING_RECEIPT' | 'RECEIVED' | 'REJECTED' | 'CANCELLED';
export type UserRole = 'STUDENT' | 'OFFICER';

export interface PaginationMetaDto {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface ApiListResponse<T> {
  data: T[];
  meta: PaginationMetaDto;
}

export interface ApiDataResponse<T> {
  data: T;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    request_id: string;
  };
}

export interface ItemPhotoDto {
  photo_id: string;
  url: string;
  expires_at: string;
  is_primary: boolean;
}

export interface ServicePostShortDto {
  post_id: number;
  name: string;
}

export interface ServicePostPhotoDto {
  photo_id: string;
  position: number;
  is_cover: boolean;
  url: string;
  expires_at: string;
}

export interface ServicePostPublicDto {
  post_id: number;
  name: string;
  location_description: string | null;
  opening_hours: string | null;
  directions: string | null;
  photos: ServicePostPhotoDto[];
}

export interface FoundItemPublicDto {
  item_id: string;
  inventory_code: string;
  item_name: string;
  category: string;
  public_description: string;
  found_location: string | null;
  found_on: string | null;
  received_at: string;
  post: ServicePostShortDto;
  photos: ItemPhotoDto[];
}

export interface InventoryOfficerDto extends FoundItemPublicDto {
  status: ItemStatus;
  is_visible: boolean;
  storage_post_id: number;
  source_submission_id: string | null;
  private_verification_notes: string | null;
}

export interface FoundSubmissionDto {
  submission_id: string;
  report_code: string;
  target_post_id: number;
  item_name: string;
  category: string;
  public_description: string;
  found_location: string;
  found_on: string;
  status: ReportStatus;
  submitted_at: string;
  report_photo_url: string;
  report_photo_expires_at: string;
}

export interface ItemCreateRequestDto {
  item_name: string;
  category: string;
  public_description: string;
  private_verification_notes?: string | null;
  found_location?: string | null;
  found_on?: string | null;
  item_photo_upload_tokens: string[];
}

export interface SubmissionCreateRequestDto {
  target_post_id: number;
  item_name: string;
  category: string;
  public_description: string;
  found_location: string;
  found_on: string;
  report_photo_upload_token: string;
}

export interface ReceiveRequestDto {
  public_description: string;
  private_verification_notes?: string | null;
  item_photo_upload_tokens: string[];
}

export interface ReasonRequestDto {
  reason: string;
}

export interface VisibilityRequestDto {
  is_visible: boolean;
}

export interface ReturnRequestDto {
  recipient_name: string;
  verification_summary: string;
}

export interface ItemReturnDto {
  return_id: string;
  item_id: string;
  recipient_name: string;
  verification_summary: string;
  returned_at: string;
  returned_by_user_id: string;
}

export interface UploadIntentRequestDto {
  purpose: 'REPORT_PHOTO' | 'ITEM_PHOTO';
  content_type: 'image/jpeg' | 'image/png' | 'image/webp';
  size_bytes: number;
}

export interface UploadIntentDto {
  upload_id: string;
  put_url: string;
  expires_at: string;
  required_headers: Record<string, string>;
}

export interface UploadFinalizedDto {
  upload_token: string;
  purpose: string;
  expires_at: string;
}

export interface MeDto {
  user_id: string;
  full_name: string;
  email: string;
  student_number: string | null;
  role: UserRole;
  assigned_post_id: number | null;
  nim_verification_status: string;
}

export interface OfficerLoginRequestDto {
  email: string;
  password: string;
}

export interface OfficerLoginResponseDto {
  token: string;
  user: MeDto;
}
