import { useState } from 'react';
import { registry } from '@/services/registry';
import { Submission } from '@/types/domain';

export interface CreateReportFormData {
  itemName: string;
  category: string;
  foundLocation: string;
  foundDate: string;
  description: string;
  targetPostId?: number;
  photoFile: File | null;
  agreedToPhysicalDrop: boolean;
}

export const useCreateReport = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdSubmission, setCreatedSubmission] = useState<Submission | null>(null);

  const submitReport = async (formData: CreateReportFormData): Promise<Submission> => {
    setIsSubmitting(true);
    setError(null);

    try {
      if (!formData.photoFile) {
        throw new Error('Foto barang temuan wajib diunggah');
      }

      if (!formData.agreedToPhysicalDrop) {
        throw new Error('Anda wajib menyetujui komitmen penyerahan fisik barang ke Pos Pengajaran');
      }

      if (!formData.itemName.trim()) {
        throw new Error('Nama barang temuan wajib diisi');
      }

      if (!formData.category.trim()) {
        throw new Error('Kategori barang wajib dipilih');
      }

      if (!formData.foundLocation.trim()) {
        throw new Error('Lokasi penemuan barang wajib diisi');
      }

      if (!formData.foundDate.trim()) {
        throw new Error('Tanggal penemuan wajib diisi');
      }

      if (!formData.description.trim()) {
        throw new Error('Deskripsi & ciri-ciri barang wajib diisi');
      }

      // Upload mock token
      const uploadService = registry.getServices().upload;
      const uploadRes = await uploadService.uploadPhoto(
        formData.photoFile,
        'REPORT_PHOTO'
      );

      const submissionService = registry.getServices().submissions;
      const newReport = await submissionService.createSubmission({
        targetPostId: formData.targetPostId || 1,
        itemName: formData.itemName.trim(),
        category: formData.category.trim(),
        description: formData.description.trim(),
        foundLocation: formData.foundLocation.trim(),
        foundDate: formData.foundDate.trim(),
        photoToken: uploadRes.uploadToken,
      });

      setCreatedSubmission(newReport);
      return newReport;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengirim laporan';
      setError(msg);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitReport,
    isSubmitting,
    error,
    createdSubmission,
    clearError: () => setError(null),
  };
};
