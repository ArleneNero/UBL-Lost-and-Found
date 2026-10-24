import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, Building2, Info } from 'lucide-react';
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
    <div className="max-w-6xl mx-auto px-4 lg:px-12 py-8 flex flex-col gap-8">
      {/* Header (Figma 03.P03) */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--lf-ink)]">
          Pos Pelayanan
        </h1>
        <p className="text-xs sm:text-sm text-[var(--lf-muted)] mt-1">
          Cari lokasi penyimpanan sebelum datang.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white rounded-2xl border border-[var(--lf-border)] p-6 space-y-4">
              <Skeleton height={140} className="w-full rounded-xl" />
              <Skeleton height={20} width="60%" />
              <Skeleton height={14} width="80%" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {posts.map((post) => {
            const shortName = post.name.replace(/^Pos\s+/i, '');
            return (
              <div
                key={post.id}
                className="bg-white rounded-2xl border border-[var(--lf-border)] p-5 flex flex-col justify-between gap-5 hover:border-[var(--lf-action)] hover:shadow-xs transition-all duration-150"
              >
                <div className="space-y-4">
                  <div className="aspect-16/9 w-full rounded-xl bg-[var(--lf-surface)] overflow-hidden border border-[var(--lf-border)] flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-[var(--lf-muted)] opacity-60" />
                  </div>

                  <div>
                    <h2 className="text-base font-bold text-[var(--lf-ink)]">{shortName}</h2>
                    <p className="text-xs text-[var(--lf-muted)] mt-0.5">Lokasi &amp; jam layanan</p>
                  </div>

                  <div className="space-y-2 text-xs border-t border-[var(--lf-border)] pt-3 text-[var(--lf-muted)]">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[var(--lf-action)] shrink-0 mt-0.5" />
                      <span>{post.location}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Clock className="w-3.5 h-3.5 text-[var(--lf-action)] shrink-0 mt-0.5" />
                      <span>{post.openingHours}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--lf-border)]">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate(`${RoutePaths.CATALOG}?post=${post.id}`)}
                    className="w-full justify-center text-xs font-semibold"
                  >
                    Lihat Barang di Pos Ini
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Info Banner (Figma 03.P03) */}
      <div className="p-5 bg-white rounded-2xl border border-[var(--lf-border)] flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-full bg-[var(--lf-soft)] text-[var(--lf-action)] flex items-center justify-center shrink-0">
          <Info className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-[var(--lf-ink)]">
            Satu katalog, tiga pos
          </h3>
          <p className="text-xs text-[var(--lf-muted)] mt-0.5 leading-relaxed">
            Barang tetap disimpan di unit yang menerima, bukan dipindahkan ke satu tempat.
          </p>
        </div>
      </div>
    </div>
  );
};

