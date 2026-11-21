import { useRef, useState } from 'react';
import { validateAndPreparePhoto } from '@/utils/photoFile';

/** Hook bersama untuk mengelola pemilihan sumber foto (Kamera / Upload File) dan validasi. */
export function usePhotoInput(onValidPhoto: (file: File) => void) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSourceOpen, setIsSourceOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = async (file: File) => {
    setError(null);
    setIsProcessing(true);
    try {
      const prepared = await validateAndPreparePhoto(file);
      onValidPhoto(prepared);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memproses foto.');
    } finally {
      setIsProcessing(false);
    }
  };

  const openFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void processFile(file);
  };

  return {
    fileInputRef,
    isSourceOpen,
    setIsSourceOpen,
    isCameraOpen,
    setIsCameraOpen,
    isProcessing,
    error,
    setError,
    processFile,
    openFilePicker,
    handleInputChange,
  };
}
