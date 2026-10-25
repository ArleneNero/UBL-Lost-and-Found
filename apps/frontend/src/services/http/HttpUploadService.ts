import { IUploadService, UploadResult } from '../contracts/IUploadService';
import { apiClient } from './apiClient';
import {
  ApiDataResponse,
  UploadIntentDto,
  UploadFinalizedDto,
  UploadIntentRequestDto,
} from '@/types/api';

export class HttpUploadService implements IUploadService {
  async uploadPhoto(
    file: File,
    purpose: 'REPORT_PHOTO' | 'ITEM_PHOTO' = 'ITEM_PHOTO'
  ): Promise<UploadResult> {
    const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
    const contentType = file.type as 'image/jpeg' | 'image/png' | 'image/webp';

    if (!validMimes.includes(contentType)) {
      throw new Error('Format foto tidak valid. Gunakan format JPEG, PNG, atau WebP.');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Ukuran file foto maksimal 5 MiB.');
    }

    // Step 1: POST /api/v1/uploads/intents
    const intentPayload: UploadIntentRequestDto = {
      purpose,
      content_type: contentType,
      size_bytes: file.size,
    };

    const intentRes = await apiClient<ApiDataResponse<UploadIntentDto>>(
      '/uploads/intents',
      {
        method: 'POST',
        body: JSON.stringify(intentPayload),
      }
    );
    const { upload_id, put_url, required_headers } = intentRes.data;

    // Step 2: Binary PUT directly to Cloudflare R2
    const putHeaders = new Headers();
    if (required_headers) {
      Object.entries(required_headers).forEach(([k, v]) => putHeaders.set(k, v));
    }
    if (!putHeaders.has('Content-Type')) {
      putHeaders.set('Content-Type', contentType);
    }

    const r2Response = await fetch(put_url, {
      method: 'PUT',
      headers: putHeaders,
      body: file,
    });

    if (!r2Response.ok) {
      throw new Error(`Gagal mengunggah foto ke storage: ${r2Response.statusText}`);
    }

    // Step 3: POST /api/v1/uploads/:id/finalize
    const finalizeRes = await apiClient<ApiDataResponse<UploadFinalizedDto>>(
      `/uploads/${upload_id}/finalize`,
      {
        method: 'POST',
      }
    );

    return {
      uploadToken: finalizeRes.data.upload_token,
      previewUrl: URL.createObjectURL(file),
    };
  }
}
