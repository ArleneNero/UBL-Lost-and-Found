import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, AlertTriangle, Calendar, MapPin, Building2, CheckSquare } from 'lucide-react';
import { RoutePaths } from '@/constants/routes';
import { Button } from '@/components/ui/Button';
import { Badge, BadgeVariant } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useOfficerReportDetail } from '@/features/officer/hooks/useOfficerReportDetail';
import { ReceivePhysicalModal, RejectReportModal } from '@/features/officer/components';

const statusMap: Record<string, { variant: BadgeVariant; label: string }> = {
  PENDING_RECEIPT: { variant: 'pending', label: 'Menunggu penyerahan' },
  RECEIVED: { variant: 'available', label: 'Diterima' },
  REJECTED: { variant: 'rejected', label: 'Ditolak' },
  CANCELLED: { variant: 'neutral', label: 'Dibatalkan' },
};

export const OfficerReportDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { submission, createdItem, isLoading, error, isActionLoading, receive, reject, refetch } = useOfficerReportDetail(id);

  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 max-w-4xl">
        <Skeleton height={36} width={180} />
        <Card className="p-6 space-y-4"><Skeleton height={200} className="w-full" /><Skeleton height={80} className="w-full" /></Card>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="py-8">
        <ErrorState title="Laporan Tidak Ditemukan" description={error || 'Informasi laporan tidak tersedia.'} onRetry={refetch} />
      </div>
    );
  }

  const cfg = statusMap[submission.status] || statusMap.PENDING_RECEIPT;
  const isPending = submission.status === 'PENDING_RECEIPT';

  const handleReceiveConfirm = async (notes: string) => {
    const item = await receive({ publicDescription: submission.description, privateNotes: notes, photoToken: 'mock-verified-receipt-token' });
    if (item) setIsReceiveOpen(false);
  };

  const handleRejectConfirm = async (reason: string) => {
    const ok = await reject(reason);
    if (ok) setIsRejectOpen(false);
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate(RoutePaths.OFFICER_REPORTS)} className="w-fit -ml-2">
        Kembali ke Daftar Laporan
      </Button>

      <Card className="flex flex-col md:flex-row gap-6 p-6">
        <div className="w-full md:w-5/12 aspect-square rounded-[14px] overflow-hidden bg-[var(--lf-surface)] border border-[var(--lf-border)] shrink-0">
          <img src={submission.photoUrl} alt={submission.itemName} className="w-full h-full object-cover" />
        </div>

        <div className="flex-1 flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[var(--lf-soft)] text-[var(--lf-action)]">{submission.category}</span>
              <Badge variant={cfg.variant}>{cfg.label}</Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--lf-ink)]">{submission.itemName}</h1>
            <p className="text-xs text-[var(--lf-muted)] font-mono">{submission.reportCode} · Pos Pengajaran</p>

            <div className="space-y-2 pt-2 border-t border-[var(--lf-border)] text-xs text-[var(--lf-muted)]">
              <p className="text-[var(--lf-ink)] leading-relaxed">{submission.description}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                <div className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-[var(--lf-action)]" /> Ditemukan {submission.foundDate}</div>
                <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-[var(--lf-action)]" /> Lokasi: {submission.foundLocation}</div>
                <div className="flex items-center gap-1.5"><Building2 className="w-4 h-4 text-[var(--lf-action)]" /> Pos: Pos Pengajaran</div>
              </div>
            </div>
          </div>

          {isPending ? (
            <div className="flex flex-col gap-3 pt-3 border-t border-[var(--lf-border)]">
              <p className="text-xs text-[var(--lf-muted)]">Pastikan mahasiswa sudah menyerahkan barang fisik. Cocokkan foto, ciri, dan keterangan.</p>
              <div className="flex items-center gap-3">
                <Button variant="primary" size="sm" leftIcon={<CheckSquare className="w-4 h-4" />} onClick={() => setIsReceiveOpen(true)}>Lanjut Konfirmasi Fisik</Button>
                <Button variant="secondary" size="sm" leftIcon={<AlertTriangle className="w-4 h-4 text-[var(--lf-error)]" />} onClick={() => setIsRejectOpen(true)}>Tolak Laporan</Button>
              </div>
            </div>
          ) : submission.status === 'RECEIVED' ? (
            <div className="flex flex-col gap-2 p-3 bg-[var(--lf-success-soft)] border border-[rgba(15,151,61,0.2)] rounded-[var(--lf-radius-md)] text-xs text-[var(--lf-success)]">
              <div className="flex items-center gap-1.5 font-bold"><CheckCircle2 className="w-4 h-4 shrink-0" /> Barang Fisik Telah Diterima</div>
              <p className="text-[11px] text-[var(--lf-muted)]">Barang sudah masuk inventaris pos Pengajaran.</p>
              {createdItem && <Button variant="secondary" size="sm" onClick={() => navigate(`/petugas/inventaris/${createdItem.id}`)} className="w-fit mt-1">Lihat di Inventaris</Button>}
            </div>
          ) : (
            <div className="p-3 bg-[var(--lf-error-soft)] border border-[rgba(217,45,32,0.2)] rounded-[var(--lf-radius-md)] text-xs text-[var(--lf-error)]"><span className="font-bold">Laporan Ditolak oleh Petugas</span></div>
          )}
        </div>
      </Card>

      <ReceivePhysicalModal isOpen={isReceiveOpen} onClose={() => setIsReceiveOpen(false)} onConfirm={handleReceiveConfirm} isSubmitting={isActionLoading} itemName={submission.itemName} reportCode={submission.reportCode} />
      <RejectReportModal isOpen={isRejectOpen} onClose={() => setIsRejectOpen(false)} onConfirm={handleRejectConfirm} isSubmitting={isActionLoading} itemName={submission.itemName} reportCode={submission.reportCode} />
    </div>
  );
};
