import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, ArrowRight, Clock, CheckCircle2, XCircle, Ban } from 'lucide-react';
import { Submission } from '@/types/domain';
import { ReportStatus } from '@/types/api';

interface StudentReportCardProps {
  report: Submission;
}

export const getStatusBadge = (status: ReportStatus) => {
  switch (status) {
    case 'PENDING_RECEIPT':
      return {
        label: 'Menunggu Serah Fisik',
        icon: Clock,
        className: 'bg-amber-50 text-amber-700 border-amber-200',
      };
    case 'RECEIVED':
      return {
        label: 'Diterima di Pos',
        icon: CheckCircle2,
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    case 'REJECTED':
      return {
        label: 'Ditolak',
        icon: XCircle,
        className: 'bg-red-50 text-red-700 border-red-200',
      };
    case 'CANCELLED':
      return {
        label: 'Dibatalkan',
        icon: Ban,
        className: 'bg-slate-100 text-slate-700 border-slate-200',
      };
    default:
      return {
        label: status,
        icon: Clock,
        className: 'bg-gray-50 text-gray-700 border-gray-200',
      };
  }
};

export const StudentReportCard: React.FC<StudentReportCardProps> = ({ report }) => {
  const badge = getStatusBadge(report.status);
  const BadgeIcon = badge.icon;

  return (
    <div className="bg-white rounded-2xl border border-[var(--lf-border)] hover:border-[var(--lf-action)]/50 p-4 sm:p-5 transition-all shadow-xs flex flex-col justify-between group">
      <div>
        {/* Header: Code & Status */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <span className="text-[11px] font-mono font-semibold text-[var(--lf-muted)] bg-[var(--lf-canvas)] px-2.5 py-1 rounded-lg">
            {report.reportCode}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border shrink-0 whitespace-nowrap ${badge.className}`}
          >
            <BadgeIcon className="w-3.5 h-3.5 shrink-0" />
            <span>{badge.label}</span>
          </span>
        </div>

        {/* Thumbnail & Title */}
        <div className="flex gap-3 mb-3">
          <div className="w-16 h-16 rounded-xl bg-slate-100/80 border border-[var(--lf-border)] overflow-hidden shrink-0 flex items-center justify-center p-1">
            <img
              src={report.photoUrl || '/assets/branding/Logo_LostnFound.png'}
              alt={report.itemName}
              className="w-full h-full object-contain group-hover:scale-105 transition-transform"
            />
          </div>

          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-semibold text-[var(--lf-action)] block mb-0.5">
              {report.category}
            </span>
            <h3 className="text-sm sm:text-base font-bold text-[var(--lf-ink)] truncate">
              {report.itemName}
            </h3>
            <p className="text-xs text-[var(--lf-muted)] line-clamp-1 mt-0.5">
              {report.description}
            </p>
          </div>
        </div>

        {/* Meta Info */}
        <div className="space-y-1.5 py-2.5 border-t border-[var(--lf-border)] text-xs text-[var(--lf-muted)]">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-[var(--lf-muted)] shrink-0" />
            <span className="truncate">{report.foundLocation}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-[var(--lf-muted)] shrink-0" />
            <span>Ditemukan: {report.foundDate}</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-[var(--lf-border)] mt-2">
        <Link
          to={`/mahasiswa/laporan-saya/${report.id}`}
          className="w-full py-2 px-3 rounded-xl bg-[var(--lf-soft)] hover:bg-[var(--lf-action)] text-[var(--lf-action)] hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
        >
          <span>Lihat Status & Detail</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};

