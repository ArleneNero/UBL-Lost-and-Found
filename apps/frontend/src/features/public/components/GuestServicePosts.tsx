import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, ArrowRight } from 'lucide-react';
import { RoutePaths } from '@/constants/routes';

interface GuestServicePostsProps {
  selectedPost?: string;
  setSelectedPost?: (post: string) => void;
}

export const GuestServicePosts: React.FC<GuestServicePostsProps> = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-2xl border border-[var(--lf-border)] p-5 flex flex-col justify-between gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[var(--lf-action)]" />
          <h2 className="text-sm font-bold text-[var(--lf-ink)]">Pos Pelayanan</h2>
        </div>
        <button
          onClick={() => navigate(RoutePaths.POSTS)}
          className="text-xs font-semibold text-[var(--lf-action)] hover:underline cursor-pointer flex items-center gap-1"
        >
          Lihat detail
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div 
        onClick={() => navigate(RoutePaths.POSTS)}
        className="flex items-center gap-3.5 p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[var(--lf-action)] transition-all cursor-pointer group"
      >
        <div className="w-10 h-10 rounded-xl bg-[#EFF8FF] text-[var(--lf-action)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
          <MapPin className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[var(--lf-ink)] group-hover:text-[var(--lf-action)] transition-colors">
              Pos Pengajaran
            </span>
            <span className="text-[10px] font-semibold text-[#12B76A] bg-[#ECFDF3] px-2 py-0.5 rounded-full">
              Aktif
            </span>
          </div>
          <p className="text-[11px] text-[var(--lf-muted)] truncate mt-0.5">
            Gedung Unit 4 Lantai 1, Ruang Pengajaran
          </p>
        </div>
      </div>

      <p className="text-[11px] text-[var(--lf-muted)]">
        Pusat pelayanan penyimpanan dan verifikasi barang temuan kampus
      </p>
    </div>
  );
};
