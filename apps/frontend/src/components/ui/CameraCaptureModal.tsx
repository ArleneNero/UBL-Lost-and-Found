import React, { useEffect } from 'react';
import { Camera, Check, FolderUp, RefreshCw, RotateCcw, X } from 'lucide-react';
import { Button } from './Button';
import { useCameraStream } from '@/hooks/useCameraStream';

export interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  onFallbackToFile: () => void;
}

/** Modal live viewfinder WebRTC untuk mengambil foto barang langsung dari kamera. */
export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  onFallbackToFile,
}) => {
  const {
    videoRef,
    isLoading,
    error,
    capturedFile,
    capturedPreviewUrl,
    toggleFacingMode,
    captureSnapshot,
    retakeSnapshot,
  } = useCameraStream(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!capturedFile) return;
    onCapture(capturedFile);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl border border-[var(--lf-border)] shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--lf-border)]">
          <h3 id="camera-modal-title" className="text-sm font-bold text-[var(--lf-ink)]">
            Ambil Foto Barang
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup kamera"
            className="p-1.5 rounded-full text-[var(--lf-muted)] hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative aspect-[4/3] w-full bg-slate-950 flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="p-6 text-center space-y-3 max-w-sm">
              <p className="text-xs text-red-200 leading-relaxed">{error}</p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={<FolderUp className="w-3.5 h-3.5" />}
                onClick={() => {
                  onClose();
                  onFallbackToFile();
                }}
              >
                Upload File Sebagai Gantinya
              </Button>
            </div>
          ) : capturedPreviewUrl ? (
            <img src={capturedPreviewUrl} alt="Hasil foto kamera" className="w-full h-full object-contain" />
          ) : (
            <>
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
              {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 text-white gap-2">
                  <div className="w-7 h-7 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs">Menyalakan kamera...</span>
                </div>
              )}
            </>
          )}
        </div>

        {!error && (
          <div className="flex items-center justify-between gap-2 p-4 bg-white border-t border-[var(--lf-border)]">
            {capturedFile ? (
              <>
                <Button type="button" variant="secondary" size="sm" leftIcon={<RotateCcw className="w-3.5 h-3.5" />} onClick={retakeSnapshot}>
                  Ulangi Foto
                </Button>
                <Button type="button" variant="primary" size="sm" leftIcon={<Check className="w-3.5 h-3.5" />} onClick={handleConfirm}>
                  Gunakan Foto Ini
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="ghost" size="sm" leftIcon={<RefreshCw className="w-3.5 h-3.5" />} onClick={toggleFacingMode} disabled={isLoading}>
                  Putar Kamera
                </Button>
                <Button type="button" variant="primary" size="sm" leftIcon={<Camera className="w-3.5 h-3.5" />} onClick={captureSnapshot} disabled={isLoading}>
                  Ambil Foto
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
