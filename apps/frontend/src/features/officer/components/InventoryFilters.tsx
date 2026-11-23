import React from 'react';
import { clsx } from 'clsx';
import { Search } from 'lucide-react';
import { ItemStatus } from '@/types/api';

export interface InventoryFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: ItemStatus | 'ALL';
  onStatusChange: (status: ItemStatus | 'ALL') => void;
  sortBy: 'newest' | 'oldest';
  onSortChange: (sort: 'newest' | 'oldest') => void;
  archivedOnly?: boolean;
  onArchivedOnlyChange?: (archivedOnly: boolean) => void;
}

export const InventoryFilters: React.FC<InventoryFiltersProps> = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  sortBy,
  onSortChange,
  archivedOnly = false,
  onArchivedOnlyChange,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--lf-muted)]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Cari barang atau kode inventaris..."
          className="w-full pl-10 pr-4 py-2.5 text-base sm:text-sm bg-[var(--lf-canvas)] border border-[var(--lf-border)] rounded-[var(--lf-radius-md)] text-[var(--lf-ink)] placeholder-[var(--lf-muted)] focus:outline-none focus:border-[var(--lf-blue)] focus:ring-1 focus:ring-[var(--lf-blue)] transition-colors"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value as ItemStatus | 'ALL')}
          className="flex-1 sm:flex-none px-3 py-2.5 text-base sm:text-xs font-medium bg-[var(--lf-canvas)] border border-[var(--lf-border)] rounded-[var(--lf-radius-md)] text-[var(--lf-ink)] focus:outline-none focus:border-[var(--lf-blue)]"
        >
          <option value="ALL">Semua status</option>
          <option value="STORED">Tersedia di pos</option>
          <option value="RETURNED_TO_OWNER">Sudah diserahkan</option>
          <option value="DISTRIBUTED">Disalurkan</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as 'newest' | 'oldest')}
          className="flex-1 sm:flex-none px-3 py-2.5 text-base sm:text-xs font-medium bg-[var(--lf-canvas)] border border-[var(--lf-border)] rounded-[var(--lf-radius-md)] text-[var(--lf-ink)] focus:outline-none focus:border-[var(--lf-blue)]"
        >
          <option value="newest">Terbaru</option>
          <option value="oldest">Terlama</option>
        </select>

        {onArchivedOnlyChange && (
          <label
            className={clsx(
              'inline-flex items-center gap-1.5 px-3 py-2 text-xs border rounded-[var(--lf-radius-md)] cursor-pointer whitespace-nowrap transition-colors',
              archivedOnly
                ? 'bg-[var(--lf-soft)] border-[var(--lf-action)] text-[var(--lf-action)] font-semibold'
                : 'bg-[var(--lf-canvas)] border-[var(--lf-border)] text-[var(--lf-ink)] font-medium'
            )}
          >
            <input
              type="checkbox"
              checked={archivedOnly}
              onChange={(e) => onArchivedOnlyChange(e.target.checked)}
              className="rounded accent-[var(--lf-action)]"
            />
            <span>Hanya Arsip</span>
          </label>
        )}
      </div>
    </div>
  );
};
