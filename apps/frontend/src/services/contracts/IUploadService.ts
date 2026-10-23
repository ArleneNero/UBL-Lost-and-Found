export interface UploadResult {
  uploadToken: string;
  previewUrl: string;
}

export interface IUploadService {
  uploadPhoto(
    file: File,
    purpose: 'REPORT_PHOTO' | 'ITEM_PHOTO'
  ): Promise<UploadResult>;
}
