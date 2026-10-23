import {
  InventoryOfficerDto,
  FoundSubmissionDto,
  ServicePostPublicDto,
  ItemReturnDto,
  UserRole,
} from '@/types/api';

/**
 * In-Memory Demo Store for UBL LostnFound
 * Resets on page reload as required by CLEAN_CODE.md (no localStorage)
 */
export interface MockState {
  posts: ServicePostPublicDto[];
  items: InventoryOfficerDto[];
  submissions: FoundSubmissionDto[];
  returns: ItemReturnDto[];
  currentUser: {
    userId: string;
    fullName: string;
    email: string;
    role: UserRole;
    assignedPostId: number | null;
    studentNumber: string | null;
  } | null;
}

export const INITIAL_MOCK_STATE: MockState = {
  posts: [
    {
      post_id: 1,
      name: 'Pos Pengajaran',
      location_description: 'Gedung Induk Lantai 1, Ruang Pengajaran',
      opening_hours: 'Senin - Jumat, 08.00 - 16.00 WIB',
      directions: 'Masuk melalui lobi utama Gedung Induk, pos berada di sebelah barat lift.',
      photos: [
        {
          photo_id: 'photo-pos-1',
          position: 1,
          is_cover: true,
          url: '/assets/branding/Logo_LostnFound.png',
          expires_at: '2026-12-31T23:59:59Z',
        },
      ],
    },
    {
      post_id: 2,
      name: 'Pos Perpustakaan',
      location_description: 'Gedung Perpustakaan Lantai 2',
      opening_hours: 'Senin - Jumat, 08.30 - 15.30 WIB',
      directions: 'Masuk melalui Gedung Perpustakaan, meja layanan sirkulasi lantai 2.',
      photos: [
        {
          photo_id: 'photo-pos-2',
          position: 1,
          is_cover: true,
          url: '/assets/branding/Logo_LostnFound.png',
          expires_at: '2026-12-31T23:59:59Z',
        },
      ],
    },
    {
      post_id: 3,
      name: 'Pos Lab Komputer',
      location_description: 'Gedung 5 Lantai 3',
      opening_hours: 'Senin - Jumat, 08.00 - 17.00 WIB',
      directions: 'Ruang teknisi utama laboratorium komputer Gedung 5.',
      photos: [
        {
          photo_id: 'photo-pos-3',
          position: 1,
          is_cover: true,
          url: '/assets/branding/Logo_LostnFound.png',
          expires_at: '2026-12-31T23:59:59Z',
        },
      ],
    },
  ],
  items: [
    {
      item_id: 'item-uuid-001',
      inventory_code: 'INV-2026-0001',
      item_name: 'Kunci Motor Honda Vario',
      category: 'Kunci',
      public_description: 'Gantungan kunci tali hitam logo Honda, dengan 1 kunci motor dan 1 remote alarm.',
      found_location: 'Parkiran Barat',
      found_on: '2026-10-12',
      received_at: '2026-10-12T10:00:00Z',
      storage_post_id: 1,
      post: { post_id: 1, name: 'Pos Pengajaran' },
      status: 'STORED',
      is_visible: true,
      source_submission_id: null,
      private_verification_notes: 'Plat nomor B 3456 SAA tercatat di STNK remote.',
      photos: [
        {
          photo_id: 'p-001',
          url: '/assets/items/kunci-motor.png',
          expires_at: '2026-12-31T23:59:59Z',
          is_primary: true,
        },
      ],
    },
    {
      item_id: 'item-uuid-002',
      inventory_code: 'INV-2026-0002',
      item_name: 'Dompet Cokelat',
      category: 'Dompet',
      public_description: 'Dompet lipat warna cokelat tua dengan aksen jahitan krem.',
      found_location: 'Lab Komputer 3',
      found_on: '2026-10-12',
      received_at: '2026-10-12T12:00:00Z',
      storage_post_id: 3,
      post: { post_id: 3, name: 'Pos Lab Komputer' },
      status: 'STORED',
      is_visible: true,
      source_submission_id: null,
      private_verification_notes: 'Berisi kartu member dan sejumlah uang tunai.',
      photos: [
        {
          photo_id: 'p-002',
          url: '/assets/items/dompet-cokelat.png',
          expires_at: '2026-12-31T23:59:59Z',
          is_primary: true,
        },
      ],
    },
    {
      item_id: 'item-uuid-003',
      inventory_code: 'INV-2026-0003',
      item_name: 'AirPods Pro',
      category: 'Elektronik',
      public_description: 'Earbuds putih beserta wadah pengisi daya.',
      found_location: 'Gedung Induk Lt. 2',
      found_on: '2026-10-12',
      received_at: '2026-10-12T14:00:00Z',
      storage_post_id: 1,
      post: { post_id: 1, name: 'Pos Pengajaran' },
      status: 'STORED',
      is_visible: true,
      source_submission_id: null,
      private_verification_notes: 'Serial number tertera pada bagian dalam wadah.',
      photos: [
        {
          photo_id: 'p-003',
          url: '/assets/items/airpods-pro.png',
          expires_at: '2026-12-31T23:59:59Z',
          is_primary: true,
        },
      ],
    },
    {
      item_id: 'item-uuid-004',
      inventory_code: 'INV-2026-0004',
      item_name: 'Tas Kanvas',
      category: 'Tas',
      public_description: 'Tas jinjing kanvas warna krem dengan sablon tipis.',
      found_location: 'Perpustakaan Lt. 2',
      found_on: '2026-10-12',
      received_at: '2026-10-12T08:00:00Z',
      storage_post_id: 2,
      post: { post_id: 2, name: 'Pos Perpustakaan' },
      status: 'STORED',
      is_visible: true,
      source_submission_id: null,
      private_verification_notes: 'Di dalam tas ada binder catatan kuliah semester 3.',
      photos: [
        {
          photo_id: 'p-004',
          url: '/assets/items/tas-kanvas.png',
          expires_at: '2026-12-31T23:59:59Z',
          is_primary: true,
        },
      ],
    },
  ],
  submissions: [
    {
      submission_id: 'sub-uuid-001',
      report_code: 'REP-2026-0001',
      target_post_id: 1,
      item_name: 'Jaket Hoodie Hitam Uniqlo',
      category: 'Pakaian',
      public_description: 'Hoodie hitam ukuran L tertinggal di saf belakang masjid.',
      found_location: 'Masjid Baitul Ilmi',
      found_on: '2026-10-20',
      status: 'PENDING_RECEIPT',
      submitted_at: '2026-10-20T14:30:00Z',
      report_photo_url: '/assets/branding/Logo_LostnFound.png',
      report_photo_expires_at: '2026-12-31T23:59:59Z',
    },
  ],
  returns: [],
  currentUser: {
    userId: 'user-officer-001',
    fullName: 'Petugas Pos Pengajaran',
    email: 'petugas.pengajaran@budiluhur.ac.id',
    role: 'OFFICER',
    assignedPostId: 1,
    studentNumber: null,
  },
};

// Singleton in-memory demo store
class MockStore {
  private state: MockState;

  constructor() {
    this.state = JSON.parse(JSON.stringify(INITIAL_MOCK_STATE));
  }

  public getState(): MockState {
    return this.state;
  }

  public reset(): void {
    this.state = JSON.parse(JSON.stringify(INITIAL_MOCK_STATE));
  }
}

export const mockStore = new MockStore();
