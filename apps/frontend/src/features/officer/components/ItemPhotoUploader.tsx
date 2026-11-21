import React from 'react';
import { AlertCircle, Camera, Image as ImageIcon, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PHOTO_ACCEPT_ATTR } from '@/utils/photoFile';
import { usePhotoInput } from '@/hooks/usePhotoInput';
import { PhotoSourceModal } from '@/components/ui/PhotoSourceModal';
import { CameraCaptureModal } from '@/components/ui/CameraCaptureModal';

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
  const {
    fileInputRef,
    isSourceOpen,
    setIsSourceOpen,
    isCameraOpen,
    setIsCameraOpen,
    isProcessing,
    error: localError,
    setError: setLocalError,
    processFile,
    openFilePicker,
    handleInputChange,
  } = usePhotoInput(onPhotoSelect);

  const displayedError = localError || error;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) void processFile(file);
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-bold text-[var(--lf-ink)]">Foto barang *</label>
      <input
        ref={fileInputRef}
        type="file"
        accept={PHOTO_ACCEPT_ATTR}
        onChange={handleInputChange}
        className="hidden"
      />

      {!previewUrl ? (
        <div
          role="button"
          tabIndex={0}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => setIsSourceOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsSourceOpen(true);
            }
          }}
          className="border-2 border-dashed border-[var(--lf-border)] hover:border-[var(--lf-blue)] rounded-[14px] p-6 text-center cursor-pointer transition-colors bg-[var(--lf-canvas)] flex flex-col items-center justify-center gap-2"
        >
          <div className="w-10 h-10 rounded-full bg-[var(--lf-soft)] text-[var(--lf-action)] flex items-center justify-center">
            <Camera className="w-5 h-5" />
          </div>
          <span className="text-sm font-semibold text-[var(--lf-action)]">
            {isProcessing ? 'Memproses foto...' : 'Unggah Foto Barang'}
          </span>
          <p className="text-xs text-[var(--lf-muted)]">Wajib unggah 1 foto (JPG/PNG, maks. 5MB).</p>
        </div>
      ) : (
        <div className="flex items-center gap-4 p-3 bg-[var(--lf-surface)] border border-[var(--lf-border)] rounded-[14px]">
          <div className="w-20 h-20 rounded-[10px] overflow-hidden bg-slate-100/80 shrink-0 border border-[var(--lf-border)] flex items-center justify-center p-1">
            <img src={previewUrl} alt="Preview barang" className="w-full h-full object-contain" />
          </div>
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-xs text-[var(--lf-muted)]">
              <ImageIcon className="w-3.5 h-3.5" /> Foto dipilih.
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" size="sm" leftIcon={<RefreshCw className="w-3 h-3" />} onClick={() => setIsSourceOpen(true)}>
                Ganti Foto
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                leftIcon={<Trash2 className="w-3 h-3 text-[var(--lf-error)]" />}
                onClick={() => {
                  setLocalError(null);
                  onPhotoRemove();
                }}
                className="text-[var(--lf-error)]"
              >
                Hapus
              </Button>
            </div>
          </div>
        </div>
      )}

      {displayedError && (
        <div className="flex items-center gap-1.5 text-xs text-[var(--lf-error)] font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{displayedError}</span>
        </div>
      )}

      <PhotoSourceModal
        isOpen={isSourceOpen}
        onClose={() => setIsSourceOpen(false)}
        onSelectCamera={() => setIsCameraOpen(true)}
        onSelectFile={openFilePicker}
      />

      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(file) => void processFile(file)}
        onFallbackToFile={openFilePicker}
      />
    </div>
  );
};
