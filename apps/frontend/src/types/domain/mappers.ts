import {
  FoundItemPublicDto,
  InventoryOfficerDto,
  ItemReturnDto,
  FoundSubmissionDto,
  ServicePostPublicDto,
  MeDto,
} from '../api';
import {
  FoundItem,
  ItemReturnRecord,
  Submission,
  ServicePost,
  UserSession,
} from './index';
import { ACTIVE_SERVICE_POST } from '@/constants/locations';

export function cleanPhotoUrl(url?: string): string {
  if (!url) return '';
  // Strip any internal Vercel preview domain to avoid SSO authentication redirect
  if (url.includes('.vercel.app/storage/')) {
    const idx = url.indexOf('/storage/');
    return url.substring(idx);
  }
  return url;
}

function mapReturnRecordDtoToDomain(dto?: ItemReturnDto | null): ItemReturnRecord | null {
  if (!dto) return null;
  return {
    returnId: dto.return_id,
    recipientName: dto.recipient_name,
    recipientIdentifier: dto.recipient_identifier ?? null,
    verificationSummary: dto.verification_summary,
    returnedAt: dto.returned_at,
    returnedByName: dto.returned_by_name ?? null,
  };
}

export function mapItemDtoToDomain(
  dto: FoundItemPublicDto | InventoryOfficerDto
): FoundItem {
  const isOfficer = 'status' in dto;

  return {
    id: dto.item_id,
    inventoryCode: dto.inventory_code,
    name: dto.item_name,
    category: dto.category,
    description: dto.public_description,
    foundLocation: dto.found_location || 'Kampus Budi Luhur',
    foundDate: dto.found_on || dto.received_at.split('T')[0],
    receivedAt: dto.received_at,
    postId: dto.post.post_id,
    postName: dto.post.name,
    photoUrl: cleanPhotoUrl(dto.photos[0]?.url),
    status: isOfficer ? (dto as InventoryOfficerDto).status : 'STORED',
    isVisible: isOfficer ? (dto as InventoryOfficerDto).is_visible : true,
    privateNotes: isOfficer
      ? (dto as InventoryOfficerDto).private_verification_notes
      : null,
    storageLimitDays: isOfficer
      ? (dto as InventoryOfficerDto).storage_limit_days ?? null
      : null,
    archivedAt: isOfficer
      ? (dto as InventoryOfficerDto).archived_at ?? null
      : null,
    returnRecord: isOfficer
      ? mapReturnRecordDtoToDomain((dto as InventoryOfficerDto).return_record)
      : null,
  };
}

export function mapSubmissionDtoToDomain(dto: FoundSubmissionDto): Submission {
  return {
    id: dto.submission_id,
    reportCode: dto.report_code,
    targetPostId: dto.target_post_id,
    itemName: dto.item_name,
    category: dto.category,
    description: dto.public_description,
    foundLocation: dto.found_location,
    foundDate: dto.found_on,
    status: dto.status,
    submittedAt: dto.submitted_at,
    photoUrl: cleanPhotoUrl(dto.report_photo_url),
  };
}

export function mapServicePostDtoToDomain(dto: ServicePostPublicDto): ServicePost {
  return {
    id: dto.post_id,
    name: dto.name,
    location: dto.location_description || ACTIVE_SERVICE_POST.location,
    openingHours: dto.opening_hours || ACTIVE_SERVICE_POST.openingHours,
    directions: dto.directions || ACTIVE_SERVICE_POST.locationDetailed,
    photos: dto.photos.map((p) => p.url),
  };
}

export function mapMeDtoToDomain(dto: MeDto): UserSession {
  return {
    id: dto.user_id,
    name: dto.full_name,
    email: dto.email,
    role: dto.role,
    assignedPostId: dto.assigned_post_id,
    studentNumber: dto.student_number,
  };
}
