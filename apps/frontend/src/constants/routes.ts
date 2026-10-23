/**
 * Definisi rute resmi untuk aplikasi UBL LostnFound
 * Sesuai dengan roadmap role-first dan arsitektur FOLDER_STRUCTURE.md
 */
export const RoutePaths = {
  // Public / Guest
  LANDING: '/',
  GUEST_HOME: '/beranda',
  CATALOG: '/barang',
  ITEM_DETAIL: '/barang/:id',
  POSTS: '/pos',
  POST_DETAIL: '/pos/:id',
  GUIDE: '/panduan',

  // Authentication
  LOGIN: '/masuk',
  REGISTER: '/daftar',
  FORGOT_PASSWORD: '/lupa-sandi',

  // Officer / Petugas
  OFFICER_DASHBOARD: '/petugas/dashboard',
  OFFICER_INVENTORY: '/petugas/inventaris',
  OFFICER_INVENTORY_DETAIL: '/petugas/inventaris/:id',
  OFFICER_REGISTER_ITEM: '/petugas/catat-barang',
  OFFICER_REPORTS: '/petugas/laporan',
  OFFICER_REPORT_DETAIL: '/petugas/laporan/:id',
  OFFICER_ACCOUNT: '/petugas/akun',

  // Student / Mahasiswa
  STUDENT_HOME: '/mahasiswa/beranda',
  STUDENT_REPORT_FOUND: '/mahasiswa/lapor-temuan',
  STUDENT_MY_REPORTS: '/mahasiswa/laporan-saya',
  STUDENT_REPORT_DETAIL: '/mahasiswa/laporan-saya/:id',
  STUDENT_PROFILE: '/mahasiswa/profil',
} as const;

export type RoutePathKey = keyof typeof RoutePaths;
export type RoutePathValue = (typeof RoutePaths)[RoutePathKey];
