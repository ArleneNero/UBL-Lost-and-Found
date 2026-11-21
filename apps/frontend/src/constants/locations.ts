/**
 * Konstanta Resmi Lokasi & Pos Layanan Kampus UBL LostnFound
 * Single Source of Truth untuk penamaan lokasi fisik dan pos pelayanan aktif.
 * Sesuai spesifikasi perbaikan UI/UX Milestone A.
 */

export interface ServicePostConfig {
  id: string;
  name: string;
  shortName: string;
  location: string;
  locationShort: string;
  locationDetailed: string;
  openingHours: string;
  footerText: string;
}

export const ACTIVE_SERVICE_POST: ServicePostConfig = {
  id: 'pos-pengajaran',
  name: 'Pos Pengajaran',
  shortName: 'Pengajaran',
  location: 'Gedung Unit 4 Lantai 1, Ruang Pengajaran',
  locationShort: 'Gedung Unit 4 Lt. 1',
  locationDetailed: 'Gedung Unit 4 Lantai 1, Ruang Pengajaran (Dekat Lobby Utama / Akses Lapangan)',
  openingHours: 'Senin - Jumat, 08.00 - 16.00 WIB',
  footerText: 'Pos Layanan: Pos Pengajaran (Gedung Unit 4 Lt. 1)',
};
