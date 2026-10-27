import "dotenv/config";

export const SEED_OFFICER_EMAIL =
  process.env.SEED_OFFICER_EMAIL || "petugas.pengajaran@budiluhur.ac.id";
export const SEED_OFFICER_PASSWORD =
  process.env.SEED_OFFICER_PASSWORD || "dummy-dev-password";
export const SEED_OFFICER_PASSWORD_HASH =
  process.env.SEED_OFFICER_PASSWORD_HASH ||
  "$2b$10$iFUewry3iiFiCq.7Ikw1Vu07HnYn/6g2giCcJRgnJPX2dwvRDS2/6";

export const officerSeedData = {
  authUserId: "seed-officer-pengajaran-01",
  fullName: "Petugas Pos Pengajaran",
  email: SEED_OFFICER_EMAIL,
  role: "OFFICER" as const,
  passwordHash: SEED_OFFICER_PASSWORD_HASH,
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
