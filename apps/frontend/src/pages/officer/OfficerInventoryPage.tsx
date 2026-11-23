import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Info, Archive, CheckCircle2, Printer } from 'lucide-react';
import { RoutePaths } from '@/constants/routes';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { useOfficerInventory } from '@/features/officer/hooks/useOfficerInventory';
import {
  InventoryFilters,
  InventoryTable,
  InventoryCardList,
  CleanInventoryModal,
  InventoryReportPrintModal,
  InventoryReportSheet,
  InventoryReportSheetProps,
} from '@/features/officer/components';

export const OfficerInventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [isCleanOpen, setIsCleanOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [activePrintReport, setActivePrintReport] = useState<InventoryReportSheetProps | null>(null);
  const [cleanMessage, setCleanMessage] = useState<string | null>(null);
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
    archivedOnly,
    setArchivedOnly,
    activeUnarchivedCount,
    activeCompletedItems,
    cleanArchive,
    fetchAllForReport,
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
    <>
      <div className="flex flex-col gap-6 print:hidden">
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

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              leftIcon={<Printer className="w-4 h-4" />}
              onClick={() => setIsPrintOpen(true)}
              className="shrink-0"
            >
              Rekap &amp; Cetak
            </Button>
            <Button
              variant="secondary"
              leftIcon={<Archive className="w-4 h-4" />}
              onClick={() => setIsCleanOpen(true)}
              className="shrink-0"
            >
              Bersihkan Arsip
            </Button>
            <Button
              variant="primary"
              leftIcon={<PlusCircle className="w-4 h-4" />}
              onClick={() => navigate(RoutePaths.OFFICER_REGISTER_ITEM)}
              className="shrink-0"
            >
              Catat Barang
            </Button>
          </div>
        </div>

      {cleanMessage && (
        <div role="status" className="flex items-center justify-between gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-[var(--lf-radius-md)] text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{cleanMessage}</span>
          </div>
          <button type="button" onClick={() => setCleanMessage(null)} className="text-emerald-700 underline cursor-pointer">Tutup</button>
        </div>
      )}

      {/* Scope Disclaimer Banner (Item D.11: Soft Blue Callout) */}
      <div className="flex items-center gap-2.5 px-4 py-3 bg-blue-50/70 border border-blue-200 rounded-[var(--lf-radius-md)] text-xs text-blue-900">
        <Info className="w-4 h-4 text-blue-600 shrink-0" />
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
        archivedOnly={archivedOnly}
        onArchivedOnlyChange={setArchivedOnly}
      />

      {archivedOnly && filteredItems.length > 0 && (
        <div
          role="status"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 bg-slate-50 border border-[var(--lf-border)] rounded-[var(--lf-radius-md)] text-xs text-[var(--lf-ink)]"
        >
          <div className="flex items-center gap-2">
            <Archive className="w-4 h-4 text-[var(--lf-action)] shrink-0" />
            <span>
              Mode <strong>Hanya Arsip</strong> aktif — menampilkan <strong>{filteredItems.length}</strong> barang yang telah diarsipkan.
            </span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setArchivedOnly(false)}
            className="self-start sm:self-auto"
          >
            Lihat Inventaris Aktif
          </Button>
        </div>
      )}

      {/* Responsive Item Views */}
      <InventoryTable
        items={filteredItems}
        isLoading={isLoading}
        onDetailClick={(id) => navigate(`/petugas/inventaris/${id}`)}
        archivedOnly={archivedOnly}
        activeUnarchivedCount={activeUnarchivedCount}
        onResetArchiveFilter={() => setArchivedOnly(false)}
      />
      <InventoryCardList
        items={filteredItems}
        isLoading={isLoading}
        onDetailClick={(id) => navigate(`/petugas/inventaris/${id}`)}
        archivedOnly={archivedOnly}
        activeUnarchivedCount={activeUnarchivedCount}
        onResetArchiveFilter={() => setArchivedOnly(false)}
      />

      <CleanInventoryModal
        isOpen={isCleanOpen}
        onClose={() => setIsCleanOpen(false)}
        completedItems={activeCompletedItems}
        onOpenReport={() => setIsPrintOpen(true)}
        onConfirmClean={async (month) => {
          const count = await cleanArchive(month);
          setCleanMessage(`${count} barang selesai berhasil diarsipkan.`);
          return count;
        }}
      />

      <InventoryReportPrintModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        fetchItems={fetchAllForReport}
        onReportChange={setActivePrintReport}
      />
    </div>

    {activePrintReport && (
      <div className="hidden print:block">
        <InventoryReportSheet {...activePrintReport} />
      </div>
    )}
  </>
  );
};
