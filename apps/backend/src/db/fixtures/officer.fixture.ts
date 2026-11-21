import "dotenv/config";

export const SEED_OFFICER_EMAIL =
  process.env.SEED_OFFICER_EMAIL || "lostandfound.budiluhur@gmail.com";
export const SEED_OFFICER_PASSWORD =
  process.env.SEED_OFFICER_PASSWORD || "dummy-dev-password";
export const SEED_OFFICER_PASSWORD_HASH =
  process.env.SEED_OFFICER_PASSWORD_HASH ||
  "$2b$10$l.tv/TEACqQO2ZwUJr0Qfu/w/.VC5knT97F80dhzTlTCol69ifrIi";

export const officerSeedData = {
  authUserId: "seed-officer-pengajaran-01",
  fullName: "Petugas Pos Pengajaran",
  email: SEED_OFFICER_EMAIL,
  role: "OFFICER" as const,
  passwordHash: SEED_OFFICER_PASSWORD_HASH,
};
