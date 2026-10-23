import React from 'react';
import { Submission } from '@/types/domain';
import { Badge, BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export interface ReportItemCardProps {
  report: Submission;
  statusVariant: BadgeVariant;
  statusLabel: string;
  onDetailClick: (id: string) => void;
}

export const ReportItemCard: React.FC<ReportItemCardProps> = ({
  report,
  statusVariant,
  statusLabel,
  onDetailClick,
}) => {
  const dateStr = new Date(report.submittedAt).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <div className="p-4 bg-[var(--lf-canvas)] border border-[var(--lf-border)] rounded-[var(--lf-radius-md)] flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[var(--lf-ink)]">{report.itemName}</h3>
          <p className="text-xs text-[var(--lf-muted)] mt-0.5">{report.reportCode} · {dateStr}</p>
        </div>
        <Badge variant={statusVariant}>{statusLabel}</Badge>
      </div>
      <Button variant="secondary" size="sm" onClick={() => onDetailClick(report.id)} className="w-full text-xs">
        Lihat Detail Laporan
      </Button>
    </div>
  );
};
