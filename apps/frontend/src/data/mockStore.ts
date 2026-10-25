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
      location_description: 'Gedung Unit 4 Lantai 1, Ruang Pengajaran',
      opening_hours: 'Senin - Jumat, 08.00 - 16.00 WIB',
      directions: 'Masuk melalui lobi Gedung Unit 4, pos berada di sebelah barat lift.',
      photos: [
        {
          photo_id: 'photo-pos-1',
          position: 1,
          is_cover: true,
          url: `${import.meta.env.BASE_URL}assets/branding/Logo_LostnFound.png`,
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
      found_location: 'Parkiran Barat Gedung Unit 7',
      found_on: '2026-10-24',
      received_at: '2026-10-24T10:00:00Z',
      storage_post_id: 1,
      post: { post_id: 1, name: 'Pos Pengajaran' },
      status: 'STORED',
      is_visible: true,
      source_submission_id: null,
      private_verification_notes: 'Plat nomor B 3456 SAA tercatat di STNK remote.',
      photos: [
        {
          photo_id: 'p-001',
          url: `${import.meta.env.BASE_URL}assets/items/kunci-motor.png`,
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
      storage_post_id: 1,
      post: { post_id: 1, name: 'Pos Pengajaran' },
      status: 'STORED',
      is_visible: true,
      source_submission_id: null,
      private_verification_notes: 'Berisi kartu member dan sejumlah uang tunai.',
      photos: [
        {
          photo_id: 'p-002',
          url: `${import.meta.env.BASE_URL}assets/items/dompet-cokelat.png`,
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
      found_location: 'Gedung Unit 4 Lt. 2',
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
          url: `${import.meta.env.BASE_URL}assets/items/airpods-pro.png`,
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
      storage_post_id: 1,
      post: { post_id: 1, name: 'Pos Pengajaran' },
      status: 'STORED',
      is_visible: true,
      source_submission_id: null,
      private_verification_notes: 'Di dalam tas ada binder catatan kuliah semester 3.',
      photos: [
        {
          photo_id: 'p-004',
          url: `${import.meta.env.BASE_URL}assets/items/tas-kanvas.png`,
          expires_at: '2026-12-31T23:59:59Z',
          is_primary: true,
        },
      ],
    },
    {
      item_id: 'item-uuid-005',
      inventory_code: 'INV-2026-0005',
      item_name: 'Buku Catatan Spiral Kampus',
      category: 'Alat Tulis',
      public_description: 'Buku catatan spiral sampul biru bertuliskan materi perkuliahan.',
      found_location: 'Lobby Gedung Pengajaran',
      found_on: '2026-10-16',
      received_at: '2026-10-16T10:00:00Z',
      storage_post_id: 1,
      post: { post_id: 1, name: 'Pos Pengajaran' },
      status: 'STORED',
      is_visible: true,
      source_submission_id: null,
      private_verification_notes: 'Halaman depan bertuliskan mata kuliah Basis Data dan nama dosen.',
      photos: [
        {
          photo_id: 'p-005',
          url: `${import.meta.env.BASE_URL}assets/items/buku-catatan-spiral.png`,
          expires_at: '2026-12-31T23:59:59Z',
          is_primary: true,
        },
      ],
    },
    {
      item_id: 'item-uuid-006',
      inventory_code: 'INV-2026-0006',
      item_name: 'Charger Laptop Asus USB-C 65W',
      category: 'Elektronik',
      public_description: 'Adaptor charger laptop Asus type-C warna hitam dengan kabel bawaan.',
      found_location: 'Lab Multimedia Lt. 4',
      found_on: '2026-10-17',
      received_at: '2026-10-17T11:00:00Z',
      storage_post_id: 1,
      post: { post_id: 1, name: 'Pos Pengajaran' },
      status: 'STORED',
      is_visible: true,
      source_submission_id: null,
      private_verification_notes: 'Terdapat stiker label inisial kecil pada ujung kepala adaptor.',
      photos: [
        {
          photo_id: 'p-006',
          url: `${import.meta.env.BASE_URL}assets/items/charger-laptop-usb-c.png`,
          expires_at: '2026-12-31T23:59:59Z',
          is_primary: true,
        },
      ],
    },
    {
      item_id: 'item-uuid-007',
      inventory_code: 'INV-2026-0007',
      item_name: 'Helm Motor Hitam Doff',
      category: 'Aksesori',
      public_description: 'Helm motor half face warna hitam doff dengan kaca visor bening.',
      found_location: 'Parkiran Motor Depan Gedung Unit 6',
      found_on: '2026-10-19',
      received_at: '2026-10-19T08:30:00Z',
      storage_post_id: 1,
      post: { post_id: 1, name: 'Pos Pengajaran' },
      status: 'STORED',
      is_visible: true,
      source_submission_id: null,
      private_verification_notes: 'Ada sedikit goresan tipis di bagian belakang samping kanan.',
      photos: [
        {
          photo_id: 'p-007',
          url: `${import.meta.env.BASE_URL}assets/items/helm-motor-hitam.png`,
          expires_at: '2026-12-31T23:59:59Z',
          is_primary: true,
        },
      ],
    },
    {
      item_id: 'item-uuid-008',
      inventory_code: 'INV-2026-0008',
      item_name: 'Jaket Hoodie Navy Tebal',
      category: 'Pakaian',
      public_description: 'Jaket hoodie warna biru navy ukuran L dengan kantong depan.',
      found_location: 'Gazebo Barat Taman Budi Luhur',
      found_on: '2026-10-19',
      received_at: '2026-10-19T13:00:00Z',
      storage_post_id: 1,
      post: { post_id: 1, name: 'Pos Pengajaran' },
      status: 'STORED',
      is_visible: true,
      source_submission_id: null,
      private_verification_notes: 'Terdapat gantungan masker kain di saku kantong depan.',
      photos: [
        {
          photo_id: 'p-008',
          url: `${import.meta.env.BASE_URL}assets/items/jaket-hoodie-navy.png`,
          expires_at: '2026-12-31T23:59:59Z',
          is_primary: true,
        },
      ],
    },
    {
      item_id: 'item-uuid-009',
      inventory_code: 'INV-2026-0009',
      item_name: 'Jam Tangan Analog Tali Hitam',
      category: 'Aksesori',
      public_description: 'Jam tangan pria model analog dial hitam dengan strap kulit hitam.',
      found_location: 'Perpustakaan Pusat Lt. 2',
      found_on: '2026-10-20',
      received_at: '2026-10-20T09:15:00Z',
      storage_post_id: 1,
      post: { post_id: 1, name: 'Pos Pengajaran' },
      status: 'STORED',
      is_visible: true,
      source_submission_id: null,
      private_verification_notes: 'Bagian belakang terukir water resistant 50M.',
      photos: [
        {
          photo_id: 'p-009',
          url: `${import.meta.env.BASE_URL}assets/items/jam-tangan-analog.png`,
          expires_at: '2026-12-31T23:59:59Z',
          is_primary: true,
        },
      ],
    },
    {
      item_id: 'item-uuid-010',
      inventory_code: 'INV-2026-0010',
      item_name: 'Kacamata Frame Kotak Hitam',
      category: 'Aksesori',
      public_description: 'Kacamata frame hitam dengan lensa minus dalam wadah kacamata.',
      found_location: 'Masjid Al-Uswah Budi Luhur',
      found_on: '2026-10-20',
      received_at: '2026-10-20T14:45:00Z',
      storage_post_id: 1,
      post: { post_id: 1, name: 'Pos Pengajaran' },
      status: 'STORED',
      is_visible: true,
      source_submission_id: null,
      private_verification_notes: 'Gagang kacamata sisi kiri memiliki sambungan baut perak.',
      photos: [
        {
          photo_id: 'p-010',
          url: `${import.meta.env.BASE_URL}assets/items/kacamata-frame-hitam.png`,
          expires_at: '2026-12-31T23:59:59Z',
          is_primary: true,
        },
      ],
    },
    {
      item_id: 'item-uuid-011',
      inventory_code: 'INV-2026-0011',
      item_name: 'Payung Lipat Otomatis Hitam',
      category: 'Aksesori',
      public_description: 'Payung lipat warna hitam polos dengan gagang tombol otomatis.',
      found_location: 'Koridor Gedung Pengajaran Lt. 1',
      found_on: '2026-10-21',
      received_at: '2026-10-21T16:00:00Z',
      storage_post_id: 1,
      post: { post_id: 1, name: 'Pos Pengajaran' },
      status: 'STORED',
      is_visible: true,
      source_submission_id: null,
      private_verification_notes: 'Ujung tali gantungannya sedikit berserabut.',
      photos: [
        {
          photo_id: 'p-011',
          url: `${import.meta.env.BASE_URL}assets/items/payung-lipat.png`,
          expires_at: '2026-12-31T23:59:59Z',
          is_primary: true,
        },
      ],
    },
    {
      item_id: 'item-uuid-012',
      inventory_code: 'INV-2026-0012',
      item_name: 'Tumbler Stainless Steel Putih',
      category: 'Aksesori',
      public_description: 'Botol minum tumbler stainless steel 500ml warna putih bersih.',
      found_location: 'Auditorium Gedung Grha Mahardika',
      found_on: '2026-10-22',
      received_at: '2026-10-22T15:30:00Z',
      storage_post_id: 1,
      post: { post_id: 1, name: 'Pos Pengajaran' },
      status: 'STORED',
      is_visible: true,
      source_submission_id: null,
      private_verification_notes: 'Tutup botol memiliki ring karet abu-abu anti bocor.',
      photos: [
        {
          photo_id: 'p-012',
          url: `${import.meta.env.BASE_URL}assets/items/tumbler.png`,
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
      report_photo_url: `${import.meta.env.BASE_URL}assets/branding/Logo_LostnFound.png`,
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
