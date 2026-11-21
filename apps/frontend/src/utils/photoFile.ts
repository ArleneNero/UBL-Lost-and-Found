/**
 * Utilitas validasi dan kompresi foto untuk unggah barang temuan & laporan mahasiswa.
 * Selaras dengan batasan MIME dan ukuran di HttpUploadService (JPEG/PNG/WebP, maks 5 MiB).
 */

export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
const COMPRESS_THRESHOLD_BYTES = 1.5 * 1024 * 1024;
const MAX_DIMENSION_PX = 1920;

export const ACCEPTED_PHOTO_MIMES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
] as const;

export const PHOTO_ACCEPT_ATTR = 'image/jpeg,image/png,image/webp';

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    const timer = window.setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Timeout membaca gambar.'));
    }, 2000);
    img.onload = () => {
      window.clearTimeout(timer);
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Gagal membaca file gambar.'));
    };
    img.src = objectUrl;
  });
}

async function compressPhotoViaCanvas(file: File): Promise<File> {
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return file;
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;

  const img = await loadImageElement(file);
  const scale = Math.min(1, MAX_DIMENSION_PX / Math.max(img.width, img.height, 1));
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.85)
  );
  if (!blob) return file;

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo';
  const compressed = new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
  return compressed.size < file.size ? compressed : file;
}

/** Memvalidasi format/ukuran foto dan mengompresi gambar beresolusi besar secara otomatis. */
export async function validateAndPreparePhoto(file: File): Promise<File> {
  const mime = file.type.toLowerCase();
  if (!ACCEPTED_PHOTO_MIMES.includes(mime as (typeof ACCEPTED_PHOTO_MIMES)[number])) {
    throw new Error('Format foto harus berupa JPG, PNG, atau WebP.');
  }

  let prepared = file;
  if (file.size > COMPRESS_THRESHOLD_BYTES) {
    try {
      prepared = await compressPhotoViaCanvas(file);
    } catch {
      prepared = file;
    }
  }

  if (prepared.size > MAX_PHOTO_SIZE_BYTES) {
    throw new Error('Ukuran foto maksimal 5 MB.');
  }

  return prepared;
}
