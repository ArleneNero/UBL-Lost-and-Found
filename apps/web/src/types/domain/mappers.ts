import {
  FoundItemPublicDto,
  InventoryOfficerDto,
  FoundSubmissionDto,
  ServicePostPublicDto,
  MeDto,
} from '../api';
import { FoundItem, Submission, ServicePost, UserSession } from './index';

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
    photoUrl: dto.photos[0]?.url || '',
    status: isOfficer ? (dto as InventoryOfficerDto).status : 'STORED',
    isVisible: isOfficer ? (dto as InventoryOfficerDto).is_visible : true,
    privateNotes: isOfficer
      ? (dto as InventoryOfficerDto).private_verification_notes
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
    photoUrl: dto.report_photo_url,
  };
}

export function mapServicePostDtoToDomain(dto: ServicePostPublicDto): ServicePost {
  return {
    id: dto.post_id,
    name: dto.name,
    location: dto.location_description || 'Gedung Induk',
    openingHours: dto.opening_hours || '08.00 - 16.00 WIB',
    directions: dto.directions || 'Gedung Induk Lt. 1',
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
