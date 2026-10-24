import type { UploadContentType, UploadPurpose } from "./uploads.dto.js";

export function resolveFileExtension(contentType: UploadContentType): string {
  switch (contentType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    default:
      return ".bin";
  }
}

export function generateStoragePath(
  purpose: UploadPurpose,
  uploadId: string,
  contentType: UploadContentType
): string {
  const ext = resolveFileExtension(contentType);
  const prefix = purpose === "ITEM_PHOTO" ? "items" : "submissions";
  return `${prefix}/${uploadId}${ext}`;
}
