import React from 'react';

const CATEGORIES = ['ALL', 'Elektronik', 'Tas', 'Dompet', 'Kunci', 'KTM', 'Lainnya'];

interface CatalogFiltersRowProps {
  postIdFilter?: number;
  setPostIdFilter: (postId?: number) => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  sortOrder: 'newest' | 'oldest';
  setSortOrder: (order: 'newest' | 'oldest') => void;
  onResetFilters: () => void;
}

export const CatalogFiltersRow: React.FC<CatalogFiltersRowProps> = ({
  postIdFilter,
  setPostIdFilter,
  categoryFilter,
  setCategoryFilter,
  sortOrder,
  setSortOrder,
  onResetFilters,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Pos Filter */}
        <select
          value={postIdFilter ?? ''}
          aria-label="Filter Pos"
          onChange={(e) => setPostIdFilter(e.target.value ? Number(e.target.value) : undefined)}
          className="px-4 py-2 bg-white border border-[#D0D5DD] rounded-xl text-[#344054] font-medium focus:outline-none focus:border-[#1570EF] shadow-xs cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <option value="">Semua Pos</option>
          <option value="1">Pos Pengajaran</option>
          <option value="2">Pos Perpustakaan</option>
          <option value="3">Pos Lab Komputer</option>
        </select>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          aria-label="Filter Kategori"
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 bg-white border border-[#D0D5DD] rounded-xl text-[#344054] font-medium focus:outline-none focus:border-[#1570EF] shadow-xs cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <option value="ALL">Semua Kategori</option>
          {CATEGORIES.filter((c) => c !== 'ALL').map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        {/* Sort Filter */}
        <select
          value={sortOrder}
          aria-label="Urutkan Waktu"
          onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
          className="px-4 py-2 bg-white border border-[#D0D5DD] rounded-xl text-[#344054] font-medium focus:outline-none focus:border-[#1570EF] shadow-xs cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <option value="newest">Terbaru</option>
          <option value="oldest">Terlama</option>
        </select>
      </div>

      <button
        onClick={onResetFilters}
        className="text-xs font-semibold text-[#1570EF] hover:underline cursor-pointer"
      >
        Hapus Filter
      </button>
    </div>
  );
};
