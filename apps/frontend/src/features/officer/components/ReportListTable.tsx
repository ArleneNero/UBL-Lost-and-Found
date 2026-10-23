import React from 'react';
import { Submission } from '@/types/domain';
import { Badge, BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ReportItemCard } from './ReportItemCard';

export interface ReportListTableProps {
  reports: Submission[];
  isLoading: boolean;
  onDetailClick: (id: string) => void;
}

const statusMap: Record<Submission['status'], { variant: BadgeVariant; label: string }> = {
  PENDING_RECEIPT: { variant: 'pending', label: 'Menunggu penyerahan' },
  RECEIVED: { variant: 'available', label: 'Diterima' },
  REJECTED: { variant: 'rejected', label: 'Ditolak' },
  CANCELLED: { variant: 'neutral', label: 'Dibatalkan' },
};

export const ReportListTable: React.FC<ReportListTableProps> = ({ reports, isLoading, onDetailClick }) => {
  if (isLoading) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} height={48} className="w-full" />)}</div>;
  }
  if (reports.length === 0) {
    return (
      <div className="text-center py-10 bg-[var(--lf-canvas)] border border-[var(--lf-border)] rounded-[var(--lf-radius-lg)]">
        <p className="text-sm text-[var(--lf-muted)]">Tidak ada laporan mahasiswa yang sesuai dengan filter.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:hidden">
        {reports.map((sub) => {
          const cfg = statusMap[sub.status] || statusMap.PENDING_RECEIPT;
          return <ReportItemCard key={sub.id} report={sub} statusVariant={cfg.variant} statusLabel={cfg.label} onDetailClick={onDetailClick} />;
        })}
      </div>

      <div className="hidden sm:block overflow-x-auto border border-[var(--lf-border)] rounded-[var(--lf-radius-lg)] bg-[var(--lf-canvas)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--lf-surface)] border-b border-[var(--lf-border)] text-xs text-[var(--lf-muted)] font-semibold">
            <tr>
              <th className="px-4 py-3">Barang</th>
              <th className="px-4 py-3">Kode Laporan</th>
              <th className="px-4 py-3">Tanggal</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Tindakan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--lf-border)]">
            {reports.map((sub) => {
              const cfg = statusMap[sub.status] || statusMap.PENDING_RECEIPT;
              const dateStr = new Date(sub.submittedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
              return (
                <tr key={sub.id} className="hover:bg-[var(--lf-surface)] transition-colors">
                  <td className="px-4 py-3 font-medium text-[var(--lf-ink)]">
                    <div>{sub.itemName}</div>
                    <div className="text-xs text-[var(--lf-muted)] font-normal">{sub.category}</div>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-[var(--lf-muted)]">{sub.reportCode}</td>
                  <td className="px-4 py-3 text-xs text-[var(--lf-muted)]">{dateStr}</td>
                  <td className="px-4 py-3"><Badge variant={cfg.variant}>{cfg.label}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="secondary" size="sm" onClick={() => onDetailClick(sub.id)}>Lihat Detail Laporan</Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
