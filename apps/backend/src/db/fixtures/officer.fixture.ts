export const SEED_OFFICER_EMAIL = "lostandfound.budiluhur@gmail.com";

export const officerSeedData = {
  authUserId: "seed-officer-pengajaran-01",
  fullName: "Petugas Pos Pengajaran",
  email: SEED_OFFICER_EMAIL,
  role: "OFFICER" as const,
};

export const servicePostSeedData = {
  name: "Pos Pengajaran",
  locationDescription: "Gedung Pengajaran Lt. 1, Dekat Lobby Utama (Akses Lapangan)",
  openingHours: "Senin - Jumat, 08:00 - 16:00 WIB",
  directions: "Dari gerbang utama jalan lurus ke arah gedung pengajaran samping lapangan.",
  storageLimitDays: 30,
};

export const servicePostPhotoSeedData = {
  storagePath: "posts/pos-pengajaran-cover.webp",
  position: 1,
};
