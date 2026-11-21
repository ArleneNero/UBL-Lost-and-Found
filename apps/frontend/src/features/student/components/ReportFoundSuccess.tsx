import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ShieldAlert, ArrowRight } from 'lucide-react';
import { RoutePaths } from '@/constants/routes';
import { ACTIVE_SERVICE_POST } from '@/constants/locations';

interface ReportFoundSuccessProps {
  reportCode: string;
  reportId: string;
}

export const ReportFoundSuccess: React.FC<ReportFoundSuccessProps> = ({
  reportCode,
  reportId,
}) => {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      <div className="bg-white rounded-3xl border border-[var(--lf-border)] p-6 sm:p-10 text-center space-y-6 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-semibold inline-block">
            Status: PENDING_RECEIPT (Menunggu Penyerahan Fisik)
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--lf-ink)]">
            Laporan Berhasil Dibuat!
          </h1>
          <p className="text-xs sm:text-sm text-[var(--lf-muted)]">
            Nomor Laporan Anda: <strong className="text-[var(--lf-ink)] font-mono">{reportCode}</strong>
          </p>
        </div>

        <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl text-left space-y-2">
          <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span>Langkah Selanjutnya: Serahkan Fisik Barang</span>
          </div>
          <p className="text-xs text-amber-900 leading-relaxed">
            Silakan bawa barang temuan ini ke <strong>{ACTIVE_SERVICE_POST.name} ({ACTIVE_SERVICE_POST.location})</strong>. Petugas pos akan memeriksa fisik barang dan mencocokkannya dengan nomor laporan Anda.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            to={`/mahasiswa/laporan-saya/${reportId}`}
            className="flex-1 py-2.5 px-4 rounded-xl bg-[var(--lf-action)] text-white text-xs sm:text-sm font-semibold hover:bg-[#094bb0] transition-colors flex items-center justify-center gap-2"
          >
            <span>Lihat Detail Laporan</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to={RoutePaths.STUDENT_MY_REPORTS}
            className="flex-1 py-2.5 px-4 rounded-xl border border-[var(--lf-border)] text-[var(--lf-ink)] text-xs sm:text-sm font-semibold hover:bg-[var(--lf-canvas)] transition-colors flex items-center justify-center"
          >
            <span>Ke Daftar Laporan Saya</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

