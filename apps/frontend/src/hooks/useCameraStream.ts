import { useCallback, useEffect, useRef, useState } from 'react';

export type CameraFacingMode = 'environment' | 'user';

function mapCameraError(err: unknown): string {
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return 'Akses kamera memerlukan koneksi aman (HTTPS) atau localhost.';
  }
  const name = err instanceof DOMException ? err.name : '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Izin akses kamera ditolak. Izinkan kamera di pengaturan browser atau gunakan opsi Upload File.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'Kamera tidak terdeteksi pada perangkat ini. Silakan gunakan opsi Upload File.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'Kamera sedang digunakan oleh aplikasi lain. Tutup aplikasi tersebut lalu coba lagi.';
  }
  return 'Tidak dapat membuka kamera perangkat. Silakan gunakan opsi Upload File.';
}

/** Hook siklus hidup WebRTC kamera dengan cleanup track otomatis saat ditutup. */
export function useCameraStream(isOpen: boolean) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;
  const [facingMode, setFacingMode] = useState<CameraFacingMode>('environment');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const clearSnapshot = useCallback(() => {
    setCapturedPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setCapturedFile(null);
  }, []);

  const startStream = useCallback(async (mode: CameraFacingMode) => {
    stopStream();
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Browser ini tidak mendukung akses kamera langsung. Gunakan Upload File.');
      return;
    }
    setIsLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      if (!isOpenRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      setError(mapCameraError(err));
    } finally {
      setIsLoading(false);
    }
  }, [stopStream]);

  useEffect(() => {
    if (!isOpen) {
      stopStream();
      clearSnapshot();
      setError(null);
      return;
    }
    if (!capturedFile) startStream(facingMode);
    return () => stopStream();
  }, [isOpen, facingMode, capturedFile, startStream, stopStream, clearSnapshot]);

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const captureSnapshot = async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.9));
    if (!blob) return;

    const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
    stopStream();
    setCapturedFile(file);
    setCapturedPreviewUrl(URL.createObjectURL(blob));
  };

  return {
    videoRef,
    isLoading,
    error,
    capturedFile,
    capturedPreviewUrl,
    toggleFacingMode,
    captureSnapshot,
    retakeSnapshot: clearSnapshot,
  };
}
