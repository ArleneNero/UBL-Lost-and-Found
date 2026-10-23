import { IUploadService, UploadResult } from '../contracts/IUploadService';

export class InMemoryUploadService implements IUploadService {
  async uploadPhoto(
    file: File,
    purpose: 'REPORT_PHOTO' | 'ITEM_PHOTO'
  ): Promise<UploadResult> {
    const uploadToken = `mock-token-${purpose.toLowerCase()}-${Date.now()}`;
    const previewUrl = URL.createObjectURL(file);

    return {
      uploadToken,
      previewUrl,
    };
  }
}
