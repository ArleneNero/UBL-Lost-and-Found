import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Package, PackageOpen } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { RoutePaths } from '@/constants/routes';
import { services } from '@/services/registry';
import { FoundItem } from '@/types/domain';

export const ItemDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<FoundItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadItem = useCallback(async () => {
    if (!id) {
      setItem(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setImgError(false);

    try {
      const found = await services.items.getPublicItemById(id);
      if (isMountedRef.current) {
        setItem(found);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setItem(null);
        setError(
          err instanceof Error
            ? err.message
            : 'Terjadi gangguan jaringan atau server saat memuat detail barang.'
        );
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    void loadItem();
  }, [loadItem]);

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

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <ErrorState
          title="Gagal Memuat Detail Barang"
          description={error}
          onRetry={() => void loadItem()}
        />
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
  const dateSource = item.receivedAt || item.foundDate;
  const dateStr = new Date(dateSource).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const handleBack = () => {
    const idx = window.history.state?.idx;
    if (typeof idx === 'number' && idx > 0) {
      navigate(-1);
    } else {
      navigate(RoutePaths.CATALOG);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-8 py-8 flex flex-col gap-6">
      {/* Dynamic Back Link (Item B.7 / 4.3) */}
      <button
        type="button"
        onClick={handleBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1570EF] hover:underline w-fit cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali
      </button>

      {/* Detail Two Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Left: Authentic Item Photo */}
        <div className="relative aspect-square lg:aspect-[4/3] w-full rounded-2xl bg-slate-100/80 overflow-hidden border border-[var(--lf-border)] flex items-center justify-center p-3 shadow-xs">
          {imgError || !item.photoUrl ? (
            <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white shadow-2xs border border-[#E4E7EC] flex items-center justify-center text-[#1570EF]">
                <Package className="w-7 h-7" />
              </div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{item.category}</span>
              <span className="text-[11px] text-[var(--lf-muted)]">Foto fisik terverifikasi di pos pelayanan</span>
            </div>
          ) : (
            <img
              src={item.photoUrl}
              alt={item.name}
              loading="lazy"
              onError={() => setImgError(true)}
              className="w-full h-full object-contain"
            />
          )}
        </div>

        {/* Right: Item Metadata & Actions */}
        <div className="flex flex-col gap-5">
          <div>
            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--lf-ink)]">{item.name}</h1>
              <span className="w-fit px-3 py-1 rounded-full text-xs font-medium bg-[#EDFDF3] text-[#027A48] border border-[#D3F8DF] shrink-0">
                Tersedia di pos
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[var(--lf-muted)] mt-1.5">
              <span className="text-[#344054]">{item.category}</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#1570EF]" />
                Diterima {dateStr}
              </span>
            </div>
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
              onClick={() => navigate(`${RoutePaths.POSTS}?from=detail`)}
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
