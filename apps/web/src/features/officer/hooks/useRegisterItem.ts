import { useState, useCallback, useEffect } from 'react';
import { FoundItem } from '@/types/domain';
import { services } from '@/services/registry';

export interface RegisterItemFormData {
  name: string;
  category: string;
  description: string;
  foundLocation: string;
  foundDate: string;
  receivedDate: string;
  receivedTime: string;
  privateNotes: string;
  isPhysicallyReceived: boolean;
}

const getInitialData = (): RegisterItemFormData => ({
  name: '',
  category: '',
  description: '',
  foundLocation: '',
  foundDate: '',
  receivedDate: new Date().toISOString().split('T')[0],
  receivedTime: `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')} WIB`,
  privateNotes: '',
  isPhysicallyReceived: false,
});

export function useRegisterItem() {
  const [formData, setFormData] = useState<RegisterItemFormData>(getInitialData);
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdItem, setCreatedItem] = useState<FoundItem | null>(null);

  const handlePhotoSelect = useCallback((file: File) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPhoto(file);
    setPreviewUrl(URL.createObjectURL(file));
    setErrors((p) => ({ ...p, photo: '' }));
  }, [previewUrl]);

  const handlePhotoRemove = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPhoto(null);
    setPreviewUrl(null);
  }, [previewUrl]);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!photo) errs.photo = 'Wajib unggah 1 foto barang.';
    if (!formData.name.trim()) errs.name = 'Nama barang wajib diisi.';
    if (!formData.category) errs.category = 'Pilih kategori barang.';
    if (!formData.description.trim()) errs.description = 'Deskripsi publik wajib diisi.';
    if (!formData.isPhysicallyReceived) errs.isPhysicallyReceived = 'Centang konfirmasi penerimaan fisik.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async (): Promise<boolean> => {
    if (!validate()) return false;
    setIsSubmitting(true);
    try {
      const res = await services.items.createItem({
        name: formData.name.trim(),
        category: formData.category,
        description: formData.description.trim(),
        foundLocation: formData.foundLocation.trim() || undefined,
        foundDate: formData.foundDate || undefined,
        privateNotes: formData.privateNotes.trim() || undefined,
        photoToken: `mock-upload-token-${Date.now()}`,
      });
      setCreatedItem(res);
      return true;
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Gagal menyimpan barang' });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPhoto(null);
    setPreviewUrl(null);
    setFormData(getInitialData());
    setErrors({});
    setCreatedItem(null);
  };

  return { formData, setFormData, photo, previewUrl, handlePhotoSelect, handlePhotoRemove, errors, isSubmitting, createdItem, submit, resetForm };
}
