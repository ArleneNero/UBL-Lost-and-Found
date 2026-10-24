import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, PackageOpen } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { usePublicCatalog } from '@/features/public/hooks/usePublicCatalog';
import { PublicItemCard } from '@/features/public/components/PublicItemCard';
import { CatalogFiltersRow } from '@/features/public/components/CatalogFiltersRow';

export const CatalogPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    items,
    isLoading,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    sortOrder,
    setSortOrder,
    postIdFilter,
    setPostIdFilter,
    totalItems,
  } = usePublicCatalog(20);

  useEffect(() => {
    const q = searchParams.get('q');
    const cat = searchParams.get('cat');
    if (q) setSearchQuery(q);
    if (cat) setCategoryFilter(cat);
  }, [searchParams, setSearchQuery, setCategoryFilter]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('ALL');
    setPostIdFilter(undefined);
    setSortOrder('newest');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 md:py-8 flex flex-col gap-6">
      {/* Header (Figma 03.01) */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--lf-ink)] tracking-tight">
          Katalog Barang
        </h1>
        <p className="text-xs sm:text-sm text-[var(--lf-muted)] mt-1">
          Hanya barang yang sudah diterima petugas.
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#667085]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari nama barang..."
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-[#D0D5DD] rounded-xl text-[var(--lf-ink)] placeholder-[#667085] focus:outline-none focus:border-[#1570EF] shadow-xs"
        />
      </div>

      {/* Filters Row */}
      <CatalogFiltersRow
        postIdFilter={postIdFilter}
        setPostIdFilter={setPostIdFilter}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        onResetFilters={handleResetFilters}
      />

      {/* Status Item Count */}
      <div className="text-xs text-[var(--lf-muted)]">
        {totalItems} barang tersedia
      </div>

      {/* Items Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="bg-white rounded-2xl border border-[var(--lf-border)] p-4 space-y-3">
              <Skeleton height={140} className="w-full rounded-xl" />
              <Skeleton height={18} width="60%" />
              <Skeleton height={12} width="40%" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[var(--lf-border)] p-12 text-center flex flex-col items-center justify-center">
          <PackageOpen className="w-8 h-8 text-[var(--lf-muted)] mb-2" />
          <h2 className="text-sm font-bold text-[var(--lf-ink)]">Tidak Ada Barang Temuan Sesuai</h2>
          <button
            type="button"
            onClick={handleResetFilters}
            className="mt-3 text-xs font-semibold px-4 py-2 rounded-xl border border-[#D0D5DD] bg-white text-[#344054] hover:bg-gray-50 shadow-xs cursor-pointer"
          >
            Tampilkan Semua Barang
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <PublicItemCard key={item.id} item={item} onClick={() => navigate(`/barang/${item.id}`)} />
          ))}
        </div>
      )}

      {/* Button Muat Lebih Banyak */}
      <div className="flex justify-start pt-2">
        <button
          type="button"
          className="rounded-xl border border-[#D0D5DD] bg-white px-5 py-2.5 text-xs font-semibold text-[#344054] shadow-xs hover:bg-gray-50 transition-colors cursor-pointer"
        >
          Muat lebih banyak
        </button>
      </div>
    </div>
  );
};
