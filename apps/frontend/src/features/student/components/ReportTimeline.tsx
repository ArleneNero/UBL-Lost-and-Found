import React from 'react';
import { CheckCircle2, Clock, XCircle, Ban, AlertCircle } from 'lucide-react';
import { ReportStatus } from '@/types/api';
import { ACTIVE_SERVICE_POST } from '@/constants/locations';

interface ReportTimelineProps {
  status: ReportStatus;
  submittedAt: string;
}

export const ReportTimeline: React.FC<ReportTimelineProps> = ({ status, submittedAt }) => {
  const formattedDate = new Date(submittedAt).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-white rounded-2xl border border-[var(--lf-border)] p-5 sm:p-6">
      <h3 className="text-sm font-bold text-[var(--lf-ink)] mb-4">
        Alur Proses Penyerahan
      </h3>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--lf-border)]">
        {/* Step 1: Laporan Dibuat Online */}
        <div className="relative">
          <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[var(--lf-ink)]">
              Laporan Terkirim Online
            </h4>
            <p className="text-[11px] text-[var(--lf-muted)] mt-0.5">
              {formattedDate} WIB
            </p>
          </div>
        </div>

        {/* Step 2: Penyerahan Fisik ke Pos Pengajaran */}
        <div className="relative">
          <div
            className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs ${
              status === 'RECEIVED'
                ? 'bg-emerald-500 text-white'
                : status === 'PENDING_RECEIPT'
                ? 'bg-amber-500 text-white animate-pulse'
                : 'bg-slate-300 text-white'
            }`}
          >
            {status === 'RECEIVED' ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <Clock className="w-3.5 h-3.5" />
            )}
          </div>
          <div>
            <h4 className="text-xs font-bold text-[var(--lf-ink)]">
              Penyerahan Fisik ke {ACTIVE_SERVICE_POST.name}
            </h4>
            <p className="text-[11px] text-[var(--lf-muted)] mt-0.5">
              {status === 'PENDING_RECEIPT' &&
                `Silakan bawa fisik barang ke ${ACTIVE_SERVICE_POST.location}.`}
              {status === 'RECEIVED' &&
                'Fisik barang telah diterima dan dicocokkan oleh petugas pos.'}
              {status === 'REJECTED' &&
                'Penyerahan fisik ditolak oleh petugas pos.'}
              {status === 'CANCELLED' &&
                'Laporan dibatalkan sebelum fisik diserahkan.'}
            </p>
          </div>
        </div>

        {/* Step 3: Status Akhir */}
        <div className="relative">
          <div
            className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs ${
              status === 'RECEIVED'
                ? 'bg-emerald-500 text-white'
                : status === 'REJECTED'
                ? 'bg-red-500 text-white'
                : status === 'CANCELLED'
                ? 'bg-slate-600 text-white'
                : 'bg-gray-200 text-gray-500'
            }`}
          >
            {status === 'RECEIVED' && <CheckCircle2 className="w-3.5 h-3.5" />}
            {status === 'REJECTED' && <XCircle className="w-3.5 h-3.5" />}
            {status === 'CANCELLED' && <Ban className="w-3.5 h-3.5" />}
            {status === 'PENDING_RECEIPT' && <Clock className="w-3.5 h-3.5" />}
          </div>
          <div>
            <h4 className="text-xs font-bold text-[var(--lf-ink)]">
              {status === 'RECEIVED' && 'Tersimpan di Inventaris Resmi'}
              {status === 'REJECTED' && 'Laporan Ditolak'}
              {status === 'CANCELLED' && 'Laporan Dibatalkan'}
              {status === 'PENDING_RECEIPT' && 'Menunggu Verifikasi Akhir'}
            </h4>
            <p className="text-[11px] text-[var(--lf-muted)] mt-0.5">
              {status === 'RECEIVED' &&
                'Barang telah dipublikasikan di katalog penemuan kampus.'}
              {status === 'REJECTED' &&
                'Barang tidak memenuhi kriteria atau tidak diserahkan tepat waktu.'}
              {status === 'CANCELLED' &&
                'Pelapor telah membatalkan laporan ini.'}
              {status === 'PENDING_RECEIPT' &&
                'Petugas akan memverifikasi fisik barang setelah diterima.'}
            </p>
          </div>
        </div>
      </div>

      {status === 'PENDING_RECEIPT' && (
        <div className="mt-5 p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2 text-xs text-amber-800">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
          <span>
            <strong>Perhatian:</strong> Barang harus diserahkan ke pos paling lambat 2×24 jam jam kerja setelah laporan dibuat.
          </span>
        </div>
      )}
    </div>
  );
};

