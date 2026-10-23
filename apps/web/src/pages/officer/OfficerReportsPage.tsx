import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, FileText, PlusCircle, Search } from 'lucide-react';
import { RoutePaths } from '@/constants/routes';
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
      {/* Figma 02.M01 Alur Pemilihan Laporan */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--lf-ink)]">Pilih Jenis Laporan</h1>
        <p className="text-xs sm:text-sm text-[var(--lf-muted)] mt-1">
          Pilih alur pencatatan atau verifikasi barang temuan di pos Anda.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <button
            onClick={() => navigate(RoutePaths.OFFICER_REGISTER_ITEM)}
            className="flex items-start gap-4 p-4 text-left rounded-[var(--lf-radius-lg)] border border-[var(--lf-border)] bg-[var(--lf-canvas)] hover:border-[var(--lf-action)] hover:shadow-sm transition-all group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-[var(--lf-radius-md)] bg-[var(--lf-soft)] flex items-center justify-center text-[var(--lf-action)] shrink-0 group-hover:bg-[var(--lf-action)] group-hover:text-white transition-colors">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--lf-ink)]">Catat Barang oleh Petugas</h2>
              <p className="text-xs text-[var(--lf-muted)] mt-0.5">
                Catat langsung barang yang diserahkan penemu di pos.
              </p>
            </div>
          </button>

          <div className="flex items-start gap-4 p-4 text-left rounded-[var(--lf-radius-lg)] border-2 border-[var(--lf-action)] bg-[var(--lf-canvas)] shadow-sm">
            <div className="w-10 h-10 rounded-[var(--lf-radius-md)] bg-[var(--lf-action)] flex items-center justify-center text-white shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[var(--lf-ink)]">Laporan dari Mahasiswa</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--lf-soft)] text-[var(--lf-action)]">
                  Aktif
                </span>
              </div>
              <p className="text-xs text-[var(--lf-muted)] mt-0.5">
                Verifikasi laporan dan penerimaan fisik barang dari mahasiswa.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mandatory Notice Banner (Figma 05.01) */}
      <div className="flex items-start gap-3 p-4 bg-[var(--lf-warning-soft)] border border-[rgba(181,71,8,0.2)] rounded-[var(--lf-radius-md)] text-xs text-[var(--lf-ink)]">
        <AlertCircle className="w-5 h-5 text-[var(--lf-warning)] shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-[var(--lf-warning)]">Penting untuk Petugas:</span>
          <p className="mt-0.5 text-[var(--lf-muted)]">
            Jangan konfirmasi penerimaan jika mahasiswa belum menyerahkan barang fisik kepada petugas.
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
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-[var(--lf-canvas)] border border-[var(--lf-border)] rounded-[var(--lf-radius-md)] text-[var(--lf-ink)] placeholder-[var(--lf-muted)] focus:outline-none focus:border-[var(--lf-blue)]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
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
