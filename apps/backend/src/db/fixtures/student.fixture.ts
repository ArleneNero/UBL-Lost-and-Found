import "dotenv/config";

export const SEED_STUDENT_EMAIL =
  process.env.SEED_STUDENT_EMAIL || "2411502194@student.budiluhur.ac.id";
export const SEED_STUDENT_PASSWORD =
  process.env.SEED_STUDENT_PASSWORD || "Nero Mahasiswa";
export const SEED_STUDENT_PASSWORD_HASH =
  process.env.SEED_STUDENT_PASSWORD_HASH ||
  "$2b$10$YbkvabCo5a2Nn3B0Uq1j0e8c6XOgHN6JxcKiL5yJhiLy9YQaDpq/2";

export const studentSeedData = {
  authUserId: "seed-student-nero-01",
  fullName: "Nero",
  email: SEED_STUDENT_EMAIL,
  studentNumber: "2411502194",
  role: "STUDENT" as const,
  passwordHash: SEED_STUDENT_PASSWORD_HASH,
};
