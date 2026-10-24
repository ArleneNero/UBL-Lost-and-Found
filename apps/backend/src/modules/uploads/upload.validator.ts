import type { AuthUser } from "../auth/auth.types.js";
import type { UploadPurpose } from "./uploads.dto.js";
import type { StoredIntent } from "./intent.registry.js";
import type { ObjectMetadata } from "./storage/storage.interface.js";

export function assertRoleForPurpose(user: AuthUser, purpose: UploadPurpose): void {
  if (purpose === "ITEM_PHOTO" && user.role !== "OFFICER") {
    const err = new Error("Hanya petugas (OFFICER) yang berwenang meminta upload intent ITEM_PHOTO");
    (err as any).statusCode = 403;
    (err as any).code = "FORBIDDEN";
    throw err;
  }

  if (purpose === "REPORT_PHOTO" && user.role !== "STUDENT") {
    const err = new Error("Hanya mahasiswa (STUDENT) yang berwenang meminta upload intent REPORT_PHOTO");
    (err as any).statusCode = 403;
    (err as any).code = "FORBIDDEN";
    throw err;
  }
}

export function validateIntentForFinalize(intent: StoredIntent | null, user: AuthUser): StoredIntent {
  if (!intent) {
    const err = new Error("Upload intent tidak ditemukan atau sudah kedaluwarsa");
    (err as any).statusCode = 404;
    (err as any).code = "INTENT_NOT_FOUND";
    throw err;
  }

  if (intent.userId !== user.userId) {
    const err = new Error("Upload intent bukan milik akun Anda");
    (err as any).statusCode = 403;
    (err as any).code = "FORBIDDEN";
    throw err;
  }

  if (Date.now() > intent.expiresAt) {
    const err = new Error("Upload intent telah kedaluwarsa (batas waktu 5 menit)");
    (err as any).statusCode = 422;
    (err as any).code = "INTENT_EXPIRED";
    throw err;
  }

  return intent;
}

export function validateObjectMetadata(metadata: ObjectMetadata, intent: StoredIntent): void {
  if (!metadata.exists) {
    const err = new Error("Objek gambar belum diunggah ke storage R2");
    (err as any).statusCode = 404;
    (err as any).code = "OBJECT_NOT_FOUND";
    throw err;
  }

  if (metadata.contentLength > intent.sizeBytes) {
    const err = new Error(
      `Ukuran objek (${metadata.contentLength} bytes) melebihi deklarasi intent (${intent.sizeBytes} bytes)`
    );
    (err as any).statusCode = 422;
    (err as any).code = "PAYLOAD_TOO_LARGE";
    throw err;
  }
}
