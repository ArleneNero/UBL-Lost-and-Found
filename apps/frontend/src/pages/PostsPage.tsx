import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, Building2, Info, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { services } from '@/services/registry';
import { ServicePost } from '@/types/domain';
import { RoutePaths } from '@/constants/routes';

export const PostsPage: React.FC = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<ServicePost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadPosts() {
      setIsLoading(true);
      try {
        const data = await services.posts.getPosts();
        if (isMounted) setPosts(data);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadPosts();
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-8 flex flex-col gap-8">
      {/* Back button & Header */}
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--lf-muted)] hover:text-[var(--lf-ink)] w-fit cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali</span>
        </button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--lf-ink)]">
            Pos Pelayanan
          </h1>
          <p className="text-xs sm:text-sm text-[var(--lf-muted)] mt-1">
            Lokasi resmi penyimpanan dan verifikasi fisik barang temuan kampus.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-[var(--lf-border)] p-6 space-y-4 max-w-2xl">
          <Skeleton height={180} className="w-full rounded-xl" />
          <Skeleton height={24} width="50%" />
          <Skeleton height={16} width="80%" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-white rounded-2xl border border-[var(--lf-border)] p-6 flex flex-col justify-between gap-6 hover:border-[var(--lf-action)] hover:shadow-xs transition-all duration-150"
            >
              <div className="space-y-5">
                <div className="aspect-16/9 w-full rounded-xl bg-[var(--lf-surface)] overflow-hidden border border-[var(--lf-border)] flex items-center justify-center">
                  <Building2 className="w-12 h-12 text-[var(--lf-muted)] opacity-60" />
                </div>

                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg font-bold text-[var(--lf-ink)]">{post.name}</h2>
                    <span className="text-[11px] font-semibold text-[#12B76A] bg-[#ECFDF3] px-2.5 py-0.5 rounded-full">
                      Pos Aktif
                    </span>
                  </div>
                  <p className="text-xs text-[var(--lf-muted)] mt-1">
                    Pusat layanan informasi & verifikasi fisik barang temuan
                  </p>
                </div>

                <div className="space-y-3 text-xs border-t border-[var(--lf-border)] pt-4 text-[var(--lf-muted)]">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-[var(--lf-action)] shrink-0 mt-0.5" />
                    <span className="text-[var(--lf-ink)] font-medium leading-relaxed">
                      {post.location}
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-[var(--lf-action)] shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{post.openingHours}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--lf-border)]">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => navigate(`${RoutePaths.CATALOG}?post=${post.id}`)}
                  className="w-full justify-center text-xs font-semibold py-2.5"
                >
                  Lihat Barang di Pos Ini
                </Button>
              </div>
            </div>
          ))}

          {/* Info Card Samping */}
          <div className="p-6 bg-white rounded-2xl border border-[var(--lf-border)] flex flex-col gap-4">
            <div className="w-10 h-10 rounded-xl bg-[var(--lf-soft)] text-[var(--lf-action)] flex items-center justify-center shrink-0">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--lf-ink)]">
                Layanan Terpusat di Pos Pengajaran
              </h3>
              <p className="text-xs text-[var(--lf-muted)] mt-1 leading-relaxed">
                Saat ini seluruh barang temuan di lingkungan Universitas Budi Luhur disimpan dan diverifikasi secara terpusat di Ruang Pengajaran Gedung Unit 4 Lantai 1.
              </p>
            </div>
            <div className="text-xs text-[var(--lf-muted)] bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E2E8F0] space-y-1.5 leading-relaxed">
              <p className="font-semibold text-[var(--lf-ink)]">Petunjuk kedatangan:</p>
              <p>Bawa identitas diri (KTM/KTP) dan bukti atau penjelasan ciri khusus barang kepada petugas jaga.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
