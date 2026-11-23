import React from 'react';
import { Archive } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface InventoryEmptyStateProps {
  archivedOnly?: boolean;
  activeUnarchivedCount?: number;
  onResetArchiveFilter?: () => void;
  defaultMessage: string;
  className?: string;
}

export const InventoryEmptyState: React.FC<InventoryEmptyStateProps> = ({
  archivedOnly = false,
  activeUnarchivedCount = 0,
  onResetArchiveFilter,
  defaultMessage,
  className = '',
}) => {
  if (archivedOnly) {
    return (
      <div
        className={`text-center py-10 px-4 bg-[var(--lf-canvas)] border border-[var(--lf-border)] rounded-[var(--lf-radius-lg)] flex flex-col items-center gap-3 ${className}`}
      >
        <div className="w-10 h-10 rounded-full bg-[var(--lf-soft)] flex items-center justify-center text-[var(--lf-action)]">
          <Archive className="w-5 h-5" />
        </div>
        <div className="space-y-1 max-w-md">
          <p className="text-sm font-semibold text-[var(--lf-ink)]">
            Belum ada barang yang diarsipkan
          </p>
          <p className="text-xs text-[var(--lf-muted)]">
            Terdapat <strong>{activeUnarchivedCount}</strong> barang aktif yang belum diarsipkan di inventaris utama.
          </p>
        </div>
        {onResetArchiveFilter && (
          <Button variant="secondary" size="sm" onClick={onResetArchiveFilter}>
            Kembali ke Inventaris Aktif
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`text-center py-10 bg-[var(--lf-canvas)] border border-[var(--lf-border)] rounded-[var(--lf-radius-lg)] ${className}`}
    >
      <p className="text-sm text-[var(--lf-muted)]">{defaultMessage}</p>
    </div>
  );
};
