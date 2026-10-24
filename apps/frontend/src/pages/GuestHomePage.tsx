import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { RoutePaths } from '@/constants/routes';
import { Skeleton } from '@/components/ui/Skeleton';
import { usePublicCatalog } from '@/features/public/hooks/usePublicCatalog';
import { PublicItemCard } from '@/features/public/components/PublicItemCard';
import { GuestCategoryList } from '@/features/public/components/GuestCategoryList';
import { GuestServicePosts } from '@/features/public/components/GuestServicePosts';

export const GuestHomePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPost, setSelectedPost] = useState('Pengajaran');
  const { items, isLoading } = usePublicCatalog(4);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`${RoutePaths.CATALOG}?q=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      navigate(RoutePaths.CATALOG);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 md:py-8 flex flex-col gap-7 md:gap-8">
      {/* Search Header Banner (Figma 03.P01 Beranda Guest) */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--lf-ink)] tracking-tight">
              Sedang mencari barangmu?
            </h1>
            <p className="text-xs sm:text-sm text-[var(--lf-muted)] mt-1">
              Jelajahi daftar barang yang telah ditemukan di lingkungan kampus.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(RoutePaths.GUIDE)}
            className="w-fit self-start sm:self-auto rounded-full border border-[#D0D5DD] bg-white text-[#344054] px-4 py-2 text-xs font-semibold hover:bg-gray-50 shadow-xs cursor-pointer transition-colors"
          >
            Cara mengambil barang
          </button>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 mt-1">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#667085]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari barang atau deskripsi..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-[#D0D5DD] rounded-xl text-[var(--lf-ink)] placeholder-[#667085] focus:outline-none focus:border-[#1570EF] shadow-xs"
            />
          </div>
          <button
            type="submit"
            className="shrink-0 bg-[#1570EF] hover:bg-[#175CD3] text-white px-6 py-2.5 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Cari Barang
          </button>
        </form>
      </section>

      {/* Middle Row: Kategori & Pos Pelayanan */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <GuestCategoryList />
        <GuestServicePosts
          selectedPost={selectedPost}
          setSelectedPost={setSelectedPost}
        />
      </section>

      {/* Bottom Section: Barang Temuan Terbaru */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-[var(--lf-ink)]">
            Barang Temuan Terbaru
          </h2>
          <button
            onClick={() => navigate(RoutePaths.CATALOG)}
            className="text-xs font-semibold text-[#1570EF] hover:underline cursor-pointer"
          >
            Lihat Semua
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-white rounded-2xl border border-[var(--lf-border)] p-4 space-y-3">
                <Skeleton height={140} className="w-full rounded-xl" />
                <Skeleton height={18} width="70%" />
                <Skeleton height={12} width="40%" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-[var(--lf-border)] text-xs text-[var(--lf-muted)]">
            Belum ada barang temuan aktif yang dipublikasikan di katalog.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {items.map((item) => (
              <PublicItemCard key={item.id} item={item} onClick={() => navigate(`/barang/${item.id}`)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
