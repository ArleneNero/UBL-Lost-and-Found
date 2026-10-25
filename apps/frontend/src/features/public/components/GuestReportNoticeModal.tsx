import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, MapPin, X } from 'lucide-react';
import { RoutePaths } from '@/constants/routes';

interface GuestReportNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuestReportNoticeModal: React.FC<GuestReportNoticeModalProps> = ({
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleGoToPosts = () => {
    onClose();
    navigate(RoutePaths.POSTS);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[var(--lf-border)] flex flex-col gap-4 relative">
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--lf-muted)] hover:text-[var(--lf-ink)] hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#1570EF] flex items-center justify-center shrink-0">
          <Info className="w-6 h-6" />
        </div>

        <div className="flex flex-col gap-1.5">
          <h2 className="text-base font-bold text-[var(--lf-ink)]">
            Layanan Pelaporan Belum Tersedia
          </h2>
          <p className="text-xs text-[var(--lf-muted)] leading-relaxed">
            Mode Tamu (Guest) tidak dapat membuat laporan barang secara online.
            Jika Anda menemukan barang di lingkungan kampus Universitas Budi Luhur,
            mohon serahkan barang fisik secara langsung ke Petugas di Pos Pelayanan terdekat.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
          <button
            type="button"
            onClick={handleGoToPosts}
            className="w-full sm:flex-1 py-2.5 px-4 bg-[#1570EF] hover:bg-[#175CD3] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Lihat Lokasi Pos</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto py-2.5 px-4 bg-white hover:bg-gray-50 border border-[#D0D5DD] text-[#344054] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
