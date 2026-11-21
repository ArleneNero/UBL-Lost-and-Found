import React, { useEffect } from 'react';
import { Camera, FolderUp, X } from 'lucide-react';

export interface PhotoSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCamera: () => void;
  onSelectFile: () => void;
}

/** Dialog dua opsi saat area unggah foto diklik: Buka Kamera atau Upload File. */
export const PhotoSourceModal: React.FC<PhotoSourceModalProps> = ({
  isOpen,
  onClose,
  onSelectCamera,
  onSelectFile,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="photo-source-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm bg-white rounded-2xl border border-[var(--lf-border)] shadow-xl p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 id="photo-source-title" className="text-sm font-bold text-[var(--lf-ink)]">
              Pilih Sumber Foto
            </h3>
            <p className="text-xs text-[var(--lf-muted)] mt-0.5">
              Ambil foto langsung atau unggah file dari perangkat.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pilihan sumber foto"
            className="p-1.5 rounded-full text-[var(--lf-muted)] hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          <button
            type="button"
            onClick={() => {
              onClose();
              onSelectCamera();
            }}
            className="flex items-center gap-3.5 p-3.5 rounded-xl border border-[#D1E9FF] bg-[#EFF8FF]/70 hover:bg-[#EFF8FF] hover:border-[#1570EF] text-left transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#1570EF] text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-xs font-bold text-[var(--lf-ink)]">Buka Kamera</span>
              <span className="block text-[11px] text-[var(--lf-muted)]">
                Otomatis nyalakan kamera untuk memotret barang.
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onSelectFile();
            }}
            className="flex items-center gap-3.5 p-3.5 rounded-xl border border-[var(--lf-border)] bg-white hover:bg-slate-50 hover:border-[#1570EF] text-left transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#344054] flex items-center justify-center shrink-0 group-hover:text-[#1570EF] transition-colors">
              <FolderUp className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-xs font-bold text-[var(--lf-ink)]">Upload File / Galeri</span>
              <span className="block text-[11px] text-[var(--lf-muted)]">
                Pilih foto JPG, PNG, atau WebP (maks. 5MB).
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
