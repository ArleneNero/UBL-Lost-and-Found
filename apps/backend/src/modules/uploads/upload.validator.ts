import type { AuthUser } from "../auth/auth.types.js";
import type { UploadContentType, UploadPurpose } from "./uploads.dto.js";
import type { StoredIntent } from "./intent.registry.js";
import type { ObjectMetadata } from "./storage/storage.interface.js";
import { AppError } from "../../utils/errors.js";

export function assertRoleForPurpose(user: AuthUser, purpose: UploadPurpose): void {
  if (purpose === "ITEM_PHOTO" && user.role !== "OFFICER") {
    throw new AppError(
      "FORBIDDEN",
      "Hanya petugas (OFFICER) yang berwenang meminta upload intent ITEM_PHOTO",
      403
    );
  }

  if (purpose === "REPORT_PHOTO" && user.role !== "STUDENT") {
    throw new AppError(
      "FORBIDDEN",
      "Hanya mahasiswa (STUDENT) yang berwenang meminta upload intent REPORT_PHOTO",
      403
    );
  }
}

export function validateIntentForFinalize(
  intent: StoredIntent | null,
  user: AuthUser
): StoredIntent {
  if (!intent) {
    throw new AppError(
      "INTENT_NOT_FOUND",
      "Upload intent tidak ditemukan atau sudah kedaluwarsa",
      404
    );
  }

  if (intent.userId !== user.userId) {
    throw new AppError("FORBIDDEN", "Upload intent bukan milik akun Anda", 403);
  }

  if (intent.finalizedAt != null) {
    throw new AppError(
      "INTENT_ALREADY_FINALIZED",
      "Upload intent sudah pernah difinalisasi",
      409
    );
  }

  if (Date.now() > intent.expiresAt) {
    throw new AppError(
      "INTENT_EXPIRED",
      "Upload intent telah kedaluwarsa (batas waktu 5 menit)",
      422
    );
  }

  return intent;
}

export function validateObjectMetadata(
  metadata: ObjectMetadata,
  intent: StoredIntent
): void {
  if (!metadata.exists) {
    throw new AppError(
      "OBJECT_NOT_FOUND",
      "Objek gambar belum diunggah ke storage R2",
      404
    );
  }

  if (metadata.contentLength <= 0) {
    throw new AppError("EMPTY_UPLOAD", "Objek gambar tidak boleh kosong (0 bytes)", 422);
  }

  if (metadata.contentLength > intent.sizeBytes) {
    throw new AppError(
      "PAYLOAD_TOO_LARGE",
      `Ukuran objek (${metadata.contentLength} bytes) melebihi deklarasi intent (${intent.sizeBytes} bytes)`,
      422
    );
  }

  const normalizedContentType = (metadata.contentType || "")
    .split(";")[0]
    .trim()
    .toLowerCase();

  if (normalizedContentType !== intent.contentType) {
    throw new AppError(
      "CONTENT_TYPE_MISMATCH",
      `Tipe konten objek (${normalizedContentType || "unknown"}) tidak sesuai dengan intent (${intent.contentType})`,
      422
    );
  }
}

/**
 * Verifies the leading binary magic bytes of an uploaded object match the declared raster image MIME type.
 */
export function validateImageMagicBytes(
  headerBytes: Buffer | null,
  expectedContentType: UploadContentType
): void {
  if (!headerBytes || headerBytes.length < 3) {
    throw new AppError(
      "INVALID_IMAGE_SIGNATURE",
      "File gambar tidak memiliki header biner yang valid",
      422
    );
  }

  let matches = false;
  switch (expectedContentType) {
    case "image/jpeg":
      matches =
        headerBytes.length >= 3 &&
        headerBytes[0] === 0xff &&
        headerBytes[1] === 0xd8 &&
        headerBytes[2] === 0xff;
      break;
    case "image/png":
      matches =
        headerBytes.length >= 4 &&
        headerBytes[0] === 0x89 &&
        headerBytes[1] === 0x50 &&
        headerBytes[2] === 0x4e &&
        headerBytes[3] === 0x47;
      break;
    case "image/webp":
      matches =
        headerBytes.length >= 12 &&
        headerBytes.subarray(0, 4).toString("ascii") === "RIFF" &&
        headerBytes.subarray(8, 12).toString("ascii") === "WEBP";
      break;
  }

  if (!matches) {
    throw new AppError(
      "INVALID_IMAGE_SIGNATURE",
      `Konten biner file tidak sesuai dengan format gambar ${expectedContentType}`,
      422
    );
  }
}
