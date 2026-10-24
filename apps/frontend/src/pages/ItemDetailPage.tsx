import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, PackageOpen } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { RoutePaths } from '@/constants/routes';
import { services } from '@/services/registry';
import { FoundItem } from '@/types/domain';

export const ItemDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<FoundItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadItem() {
      if (!id) return;
      setIsLoading(true);
      try {
        const found = await services.items.getPublicItemById(id);
        if (isMounted) setItem(found);
      } catch {
        if (isMounted) setItem(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadItem();
    return () => { isMounted = false; };
  }, [id]);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 lg:px-8 py-8 flex flex-col gap-6">
        <Skeleton height={24} width={140} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-6 rounded-2xl border border-[var(--lf-border)]">
          <Skeleton height={320} className="w-full rounded-2xl" />
          <div className="space-y-4">
            <Skeleton height={32} width="70%" />
            <Skeleton height={16} width="40%" />
            <Skeleton height={60} width="100%" />
            <Skeleton height={90} width="100%" />
          </div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
        <PackageOpen className="w-12 h-12 text-[var(--lf-muted)] mb-3" />
        <h1 className="text-xl font-bold text-[var(--lf-ink)]">Barang Tidak Ditemukan</h1>
        <p className="text-xs text-[var(--lf-muted)] mt-1.5 max-w-sm">
          Barang ini tidak tersedia di katalog publik atau mungkin sudah diserahkan.
        </p>
        <Button variant="secondary" size="sm" onClick={() => navigate(RoutePaths.CATALOG)} className="mt-4">
          Kembali ke Katalog
        </Button>
      </div>
    );
  }

  const shortPos = item.postName?.replace(/^Pos\s+/i, '') || 'Pengajaran';

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-8 py-8 flex flex-col gap-6">
      {/* Back Link (Figma 03.02) */}
      <button
        onClick={() => navigate(RoutePaths.CATALOG)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1570EF] hover:underline w-fit cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke katalog
      </button>

      {/* Detail Two Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Left: Authentic Item Photo */}
        <div className="aspect-4/3 w-full rounded-2xl bg-[#F8FAFC] overflow-hidden border border-[var(--lf-border)] flex items-center justify-center shadow-xs">
          <img src={item.photoUrl} alt={item.name} loading="lazy" className="w-full h-full object-cover" />
        </div>

        {/* Right: Item Metadata & Actions */}
        <div className="flex flex-col gap-5">
          <div>
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--lf-ink)]">{item.name}</h1>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#EDFDF3] text-[#027A48] border border-[#D3F8DF] shrink-0">
                Tersedia di pos
              </span>
            </div>
            <p className="text-xs font-medium text-[var(--lf-muted)] mt-1">{item.category}</p>
            <p className="text-xs sm:text-sm text-[var(--lf-muted)] mt-2 leading-relaxed">
              {item.description || 'Tidak ada deskripsi fisik publik.'}
            </p>
          </div>

          {/* Blue Box: Barang disimpan di */}
          <div className="p-4 sm:p-5 bg-[#EFF8FF] rounded-2xl border border-[#D1E9FF] flex flex-col gap-3">
            <div className="flex items-start gap-2.5 text-xs text-[var(--lf-ink)]">
              <MapPin className="w-4 h-4 text-[#1570EF] shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="text-[11px] text-[var(--lf-muted)]">Barang disimpan di</span>
                <span className="font-bold text-sm text-[var(--lf-ink)]">{shortPos}</span>
              </div>
            </div>
            <button
              onClick={() => navigate(RoutePaths.POSTS)}
              className="w-full bg-[#1570EF] hover:bg-[#175CD3] text-white py-2.5 rounded-xl font-semibold text-xs transition-colors cursor-pointer text-center shadow-xs"
            >
              Lihat Lokasi Pengambilan
            </button>
          </div>

          {/* White Guidance Card */}
          <div className="p-4 sm:p-5 bg-white rounded-2xl border border-[var(--lf-border)] flex flex-col gap-3 shadow-xs">
            <div>
              <h2 className="text-sm font-bold text-[var(--lf-ink)]">Merasa ini barang milikmu?</h2>
              <p className="text-xs text-[var(--lf-muted)] mt-1 leading-relaxed">
                Datang ke pos dan siapkan informasi atau bukti kepemilikan. Verifikasi dilakukan langsung oleh petugas, tanpa klaim online.
              </p>
            </div>
            <button
              onClick={() => navigate(RoutePaths.GUIDE)}
              className="w-full bg-white hover:bg-gray-50 border border-[var(--lf-border)] text-[#1570EF] py-2.5 rounded-xl font-semibold text-xs transition-colors cursor-pointer text-center"
            >
              Lihat alur pengambilan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
