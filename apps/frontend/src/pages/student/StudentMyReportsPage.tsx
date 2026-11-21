import React from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, ClipboardList, Filter } from 'lucide-react';
import { RoutePaths } from '@/constants/routes';
import { useStudentReports, StudentFilterStatus } from '@/features/student/hooks/useStudentReports';
import { StudentReportCard } from '@/features/student/components/StudentReportCard';

const FILTER_TABS: { label: string; value: StudentFilterStatus }[] = [
  { label: 'Semua Status', value: 'ALL' },
  { label: 'Menunggu Serah Fisik', value: 'PENDING_RECEIPT' },
  { label: 'Diterima di Pos', value: 'RECEIVED' },
  { label: 'Ditolak', value: 'REJECTED' },
  { label: 'Dibatalkan', value: 'CANCELLED' },
];

export const StudentMyReportsPage: React.FC = () => {
  const {
    reports,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    totalPages,
    total,
    isLoading,
  } = useStudentReports();

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--lf-ink)]">
            Laporan Temuan Saya
          </h1>
          <p className="text-xs sm:text-sm text-[var(--lf-muted)] mt-1">
            Riwayat dan pelacakan seluruh barang yang pernah Anda laporkan
          </p>
        </div>

        <Link
          to={RoutePaths.STUDENT_REPORT_FOUND}
          className="self-start sm:self-auto px-4 py-2.5 bg-[var(--lf-action)] hover:bg-[#094bb0] text-white font-semibold text-xs sm:text-sm rounded-xl flex items-center gap-2 shadow-sm transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Lapor Temuan Baru</span>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <Filter className="w-4 h-4 text-[var(--lf-muted)] shrink-0 mr-1" />
        {FILTER_TABS.map((tab) => {
          const isActive = statusFilter === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3.5 py-2 sm:py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-[var(--lf-action)] text-white shadow-xs'
                  : 'bg-white text-[var(--lf-muted)] border border-[var(--lf-border)] hover:border-[var(--lf-action)]/40 hover:text-[var(--lf-ink)]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Reports Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-[var(--lf-muted)]">
          Memuat daftar laporan...
        </div>
      ) : reports.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.map((report) => (
              <StudentReportCard key={report.id} report={report} />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[var(--lf-border)]">
              <span className="text-xs text-[var(--lf-muted)]">
                Menampilkan halaman {page} dari {totalPages} ({total} laporan)
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1.5 rounded-lg border border-[var(--lf-border)] text-xs font-medium disabled:opacity-40"
                >
                  Sebelumnya
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1.5 rounded-lg border border-[var(--lf-border)] text-xs font-medium disabled:opacity-40"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-3xl border border-[var(--lf-border)] p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[var(--lf-canvas)] text-[var(--lf-muted)] flex items-center justify-center mx-auto">
            <ClipboardList className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[var(--lf-ink)]">
            {statusFilter === 'ALL'
              ? 'Belum Ada Laporan Temuan'
              : 'Tidak Ada Laporan dengan Status Ini'}
          </h3>
          <p className="text-xs text-[var(--lf-muted)] max-w-sm mx-auto">
            {statusFilter === 'ALL'
              ? 'Anda belum pernah mengirimkan laporan penemuan barang.'
              : `Belum ada laporan temuan Anda yang berstatus ${FILTER_TABS.find((t) => t.value === statusFilter)?.label || ''}.`}
          </p>
          {statusFilter !== 'ALL' && (
            <button
              onClick={() => setStatusFilter('ALL')}
              className="text-xs text-[var(--lf-action)] font-semibold hover:underline"
            >
              Tampilkan Semua Status
            </button>
          )}
        </div>
      )}
    </div>
  );
};

