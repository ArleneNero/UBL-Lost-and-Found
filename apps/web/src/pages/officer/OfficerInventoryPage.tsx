import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Info } from 'lucide-react';
import { RoutePaths } from '@/constants/routes';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { useOfficerInventory } from '@/features/officer/hooks/useOfficerInventory';
import {
  InventoryFilters,
  InventoryTable,
  InventoryCardList,
} from '@/features/officer/components';

export const OfficerInventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    filteredItems,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    refetch,
  } = useOfficerInventory();

  if (error) {
    return (
      <div className="py-8">
        <ErrorState
          title="Gagal Memuat Inventaris"
          description={error}
          onRetry={refetch}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--lf-ink)]">
              <span className="sm:hidden">Inventaris Barang</span>
              <span className="hidden sm:inline">Inventaris Pengajaran</span>
            </h1>
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--lf-soft)] text-[var(--lf-action)]">
              Petugas Pengajaran
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--lf-muted)] mt-1">
            <span className="sm:hidden">Hanya data unit Pengajaran.</span>
            <span className="hidden sm:inline">
              Inventaris Barang — Kelola fisik barang temuan dan visibilitas katalog pos aktif.
            </span>
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<PlusCircle className="w-4 h-4" />}
          onClick={() => navigate(RoutePaths.OFFICER_REGISTER_ITEM)}
          className="shrink-0"
        >
          Catat Barang
        </Button>
      </div>

      {/* Scope Disclaimer Banner (Figma Exact) */}
      <div className="flex items-center gap-2.5 px-4 py-3 bg-[var(--lf-surface)] border border-[var(--lf-border)] rounded-[var(--lf-radius-md)] text-xs text-[var(--lf-muted)]">
        <Info className="w-4 h-4 text-[var(--lf-action)] shrink-0" />
        <span>Data hanya dari unit Pengajaran. Tidak ada akses edit inventaris unit lain.</span>
      </div>

      {/* Filter and Search Controls */}
      <InventoryFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {/* Responsive Item Views */}
      <InventoryTable
        items={filteredItems}
        isLoading={isLoading}
        onDetailClick={(id) => navigate(`/petugas/inventaris/${id}`)}
      />
      <InventoryCardList
        items={filteredItems}
        isLoading={isLoading}
        onDetailClick={(id) => navigate(`/petugas/inventaris/${id}`)}
      />
    </div>
  );
};
