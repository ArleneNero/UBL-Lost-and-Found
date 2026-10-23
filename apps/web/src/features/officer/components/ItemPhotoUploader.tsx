import React, { useRef } from 'react';
import { Camera, Image as ImageIcon, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface ItemPhotoUploaderProps {
  previewUrl: string | null;
  onPhotoSelect: (file: File) => void;
  onPhotoRemove: () => void;
  error?: string | null;
}

export const ItemPhotoUploader: React.FC<ItemPhotoUploaderProps> = ({
  previewUrl,
  onPhotoSelect,
  onPhotoRemove,
  error,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Ukuran foto maksimal 5MB.');
        return;
      }
      onPhotoSelect(file);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-bold text-[var(--lf-ink)]">Foto barang *</label>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
      {!previewUrl ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-[var(--lf-border)] hover:border-[var(--lf-blue)] rounded-[14px] p-6 text-center cursor-pointer transition-colors bg-[var(--lf-canvas)] flex flex-col items-center justify-center gap-2"
        >
          <div className="w-10 h-10 rounded-full bg-[var(--lf-soft)] text-[var(--lf-action)] flex items-center justify-center">
            <Camera className="w-5 h-5" />
          </div>
          <span className="text-sm font-semibold text-[var(--lf-action)]">Unggah Foto Barang</span>
          <p className="text-xs text-[var(--lf-muted)]">Wajib unggah 1 foto (JPG/PNG), maksimal 1 (5MB).</p>
        </div>
      ) : (
        <div className="flex items-center gap-4 p-3 bg-[var(--lf-surface)] border border-[var(--lf-border)] rounded-[14px]">
          <div className="w-20 h-20 rounded-[10px] overflow-hidden bg-black/5 shrink-0 border border-[var(--lf-border)]">
            <img src={previewUrl} alt="Preview barang" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-xs text-[var(--lf-muted)]">
              <ImageIcon className="w-3.5 h-3.5" /> Foto contoh dipilih.
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" leftIcon={<RefreshCw className="w-3 h-3" />} onClick={() => fileInputRef.current?.click()}>
                Ganti Foto
              </Button>
              <Button variant="ghost" size="sm" leftIcon={<Trash2 className="w-3 h-3 text-[var(--lf-error)]" />} onClick={onPhotoRemove} className="text-[var(--lf-error)]">
                Hapus
              </Button>
            </div>
          </div>
        </div>
      )}
      {error && <span className="text-xs text-[var(--lf-error)] font-medium">{error}</span>}
    </div>
  );
};
