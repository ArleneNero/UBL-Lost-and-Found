import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, PlusCircle, Search } from 'lucide-react';
import { RoutePaths } from '@/constants/routes';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { ReportStatus } from '@/types/api';
import { useOfficerReports } from '@/features/officer/hooks/useOfficerReports';
import { ReportListTable } from '@/features/officer/components/ReportListTable';

const STATUS_FILTERS: { label: string; value: ReportStatus | 'ALL' }[] = [
  { label: 'Semua', value: 'ALL' },
  { label: 'Menunggu', value: 'PENDING_RECEIPT' },
  { label: 'Diterima', value: 'RECEIVED' },
  { label: 'Ditolak', value: 'REJECTED' },
  { label: 'Dibatalkan', value: 'CANCELLED' },
];

export const OfficerReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    filteredSubmissions,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    refetch,
  } = useOfficerReports();

  if (error) {
    return (
      <div className="py-8">
        <ErrorState title="Gagal Memuat Laporan" description={error} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Header Laporan Mahasiswa & Action Catat Barang Manual (Item D.4) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--lf-ink)]">
              Laporan Mahasiswa
            </h1>
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--lf-soft)] text-[var(--lf-action)]">
              Petugas Pengajaran
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--lf-muted)] mt-1">
            Kelola dan verifikasi laporan barang temuan dari mahasiswa di pos Anda.
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<PlusCircle className="w-4 h-4" />}
          onClick={() => navigate(RoutePaths.OFFICER_REGISTER_ITEM, { state: { from: 'laporan' } })}
          className="w-full sm:w-auto shrink-0"
        >
          Catat Barang Manual
        </Button>
      </div>

      {/* Mandatory Notice Banner + Inline Shortcut (Item D.5) */}
      <div className="flex items-start gap-3 p-4 bg-[var(--lf-warning-soft)] border border-[rgba(181,71,8,0.2)] rounded-[var(--lf-radius-md)] text-xs text-[var(--lf-ink)]">
        <AlertCircle className="w-5 h-5 text-[var(--lf-warning)] shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-[var(--lf-warning)]">Penting untuk Petugas:</span>
          <p className="mt-0.5 text-[var(--lf-muted)] leading-relaxed">
            Jangan konfirmasi penerimaan jika mahasiswa belum menyerahkan barang fisik kepada petugas.{' '}
            Jika penemu menyerahkan barang langsung tanpa laporan online, gunakan{' '}
            <button
              type="button"
              onClick={() => navigate(RoutePaths.OFFICER_REGISTER_ITEM, { state: { from: 'laporan' } })}
              className="inline-flex items-center gap-1 font-semibold underline text-amber-900 hover:text-amber-700 cursor-pointer"
            >
              <span>Catat Barang Manual</span>
              <ArrowRight className="w-3 h-3" />
            </button>
            .
          </p>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--lf-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kode laporan atau nama barang..."
            className="w-full pl-10 pr-4 py-2.5 text-base sm:text-sm bg-[var(--lf-canvas)] border border-[var(--lf-border)] rounded-[var(--lf-radius-md)] text-[var(--lf-ink)] placeholder-[var(--lf-muted)] focus:outline-none focus:border-[var(--lf-blue)]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3.5 py-2 sm:py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === f.value
                  ? 'bg-[var(--lf-action)] text-white'
                  : 'bg-[var(--lf-surface)] text-[var(--lf-muted)] hover:bg-[var(--lf-border)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Report List */}
      <ReportListTable
        reports={filteredSubmissions}
        isLoading={isLoading}
        onDetailClick={(id) => navigate(`/petugas/laporan/${id}`)}
      />
    </div>
  );
};
