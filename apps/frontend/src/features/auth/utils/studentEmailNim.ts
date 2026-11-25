export const STUDENT_EMAIL_DOMAIN = '@student.budiluhur.ac.id';
export const STUDENT_NIM_LENGTH = 10;

export type StudentEmailNimResult =
  | { valid: true; normalizedEmail: string; nim: string }
  | { valid: false; error: string };

/**
 * Validates that a student campus email belongs to @student.budiluhur.ac.id
 * and that its local part consists solely of an exact 10-digit NIM.
 */
export function validateAndExtractStudentNim(email: string): StudentEmailNimResult {
  const normalized = email.trim().toLowerCase();

  if (!normalized.endsWith(STUDENT_EMAIL_DOMAIN)) {
    return {
      valid: false,
      error: 'Wajib menggunakan email resmi mahasiswa Budi Luhur (@student.budiluhur.ac.id).',
    };
  }

  const atIndex = normalized.indexOf('@');
  if (atIndex !== normalized.lastIndexOf('@')) {
    return {
      valid: false,
      error: 'Wajib menggunakan email resmi mahasiswa Budi Luhur (@student.budiluhur.ac.id).',
    };
  }

  const localPart = normalized.slice(0, atIndex);

  if (!/^\d+$/.test(localPart)) {
    return {
      valid: false,
      error:
        'Bagian sebelum @ pada email kampus harus berupa tepat 10 angka NIM tanpa huruf atau simbol (contoh: 2411502194@student.budiluhur.ac.id).',
    };
  }

  if (localPart.length !== STUDENT_NIM_LENGTH) {
    return {
      valid: false,
      error: `NIM pada email kampus wajib tepat 10 angka, tidak kurang dan tidak lebih (terdeteksi ${localPart.length} angka). Contoh: 2411502194@student.budiluhur.ac.id`,
    };
  }

  return {
    valid: true,
    normalizedEmail: normalized,
    nim: localPart,
  };
}
