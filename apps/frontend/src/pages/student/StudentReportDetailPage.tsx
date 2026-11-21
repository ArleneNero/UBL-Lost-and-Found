import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Building2, Ban, AlertCircle } from 'lucide-react';
import { RoutePaths } from '@/constants/routes';
import { ACTIVE_SERVICE_POST } from '@/constants/locations';
import { registry } from '@/services/registry';
import { Submission } from '@/types/domain';
import { getStatusBadge } from '@/features/student/components/StudentReportCard';
import { ReportTimeline } from '@/features/student/components/ReportTimeline';
import { ReportDetailInfo } from '@/features/student/components/ReportDetailInfo';
import { CancelReportModal } from '@/features/student/components/CancelReportModal';

export const StudentReportDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [report, setReport] = useState<Submission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const submissionService = registry.getServices().submissions;
      const data = await submissionService.getSubmissionById(id);
      if (!data) setError('Laporan tidak ditemukan.');
      else setReport(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat detail laporan';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleCancel = async (reason: string) => {
    if (!report) return;
    await registry.getServices().submissions.cancelSubmission(report.id, reason);
    await fetchDetail();
  };

  if (isLoading) {
    return <div className="max-w-5xl mx-auto px-4 py-16 text-center text-xs text-[var(--lf-muted)]">Memuat detail laporan...</div>;
  }

  if (error || !report) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-[var(--lf-ink)]">{error || 'Laporan Tidak Ditemukan'}</h2>
        <Link to={RoutePaths.STUDENT_MY_REPORTS} className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--lf-action)] hover:underline">
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Laporan Saya</span>
        </Link>
      </div>
    );
  }

  const badge = getStatusBadge(report.status);
  const BadgeIcon = badge.icon;

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6 sm:py-8 space-y-6">
      <Link to={RoutePaths.STUDENT_MY_REPORTS} className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--lf-muted)] hover:text-[var(--lf-ink)]">
        <ArrowLeft className="w-4 h-4" />
        <span>Kembali ke Laporan Saya</span>
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--lf-border)]">
        <div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1.5">
            <span className="font-mono text-xs font-bold text-[var(--lf-muted)] bg-[var(--lf-canvas)] px-2.5 py-1 rounded-lg">{report.reportCode}</span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border shrink-0 whitespace-nowrap ${badge.className}`}>
              <BadgeIcon className="w-3.5 h-3.5 shrink-0" />
              <span>{badge.label}</span>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--lf-ink)]">{report.itemName}</h1>
        </div>

        {report.status === 'PENDING_RECEIPT' && (
          <button onClick={() => setIsCancelModalOpen(true)} className="self-start sm:self-auto px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold flex items-center gap-2 transition-colors">
            <Ban className="w-4 h-4" />
            <span>Batalkan Laporan Ini</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ReportDetailInfo report={report} />
        </div>

        <div className="space-y-6">
          <ReportTimeline status={report.status} submittedAt={report.submittedAt} />
          <div className="bg-white rounded-2xl border border-[var(--lf-border)] p-5 space-y-3">
            <div className="flex items-center gap-2.5 text-xs font-bold text-[var(--lf-action)]">
              <Building2 className="w-4 h-4 shrink-0" />
              <span>{ACTIVE_SERVICE_POST.name}</span>
            </div>
            <p className="text-xs text-[var(--lf-muted)] leading-relaxed">
              {ACTIVE_SERVICE_POST.locationDetailed}. Buka {ACTIVE_SERVICE_POST.openingHours}.
            </p>
          </div>
        </div>
      </div>

      <CancelReportModal isOpen={isCancelModalOpen} reportCode={report.reportCode} onClose={() => setIsCancelModalOpen(false)} onConfirmCancel={handleCancel} />
    </div>
  );
};
