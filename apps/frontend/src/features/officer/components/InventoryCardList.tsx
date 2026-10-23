import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { FoundItem } from '@/types/domain';
import { Badge, BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { isItemOverdue } from '../selectors/inventorySelectors';

export interface InventoryCardListProps {
  items: FoundItem[];
  isLoading: boolean;
  onDetailClick: (id: string) => void;
}

const statusMap: Record<FoundItem['status'], { variant: BadgeVariant; label: string }> = {
  STORED: { variant: 'available', label: 'Tersedia di pos' },
  RETURNED_TO_OWNER: { variant: 'returned', label: 'Sudah diserahkan' },
  DISTRIBUTED: { variant: 'neutral', label: 'Disalurkan' },
};

export const InventoryCardList: React.FC<InventoryCardListProps> = ({ items, isLoading, onDetailClick }) => {
  if (isLoading) {
    return <div className="flex flex-col gap-3 sm:hidden">{[1, 2, 3].map((i) => <Skeleton key={i} height={80} className="w-full" />)}</div>;
  }
  if (items.length === 0) {
    return (
      <div className="sm:hidden text-center py-8 bg-[var(--lf-canvas)] border border-[var(--lf-border)] rounded-[var(--lf-radius-lg)]">
        <p className="text-sm text-[var(--lf-muted)]">Tidak ada barang inventaris yang ditemukan.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3 sm:hidden">
      {items.map((item) => {
        const cfg = statusMap[item.status] || statusMap.STORED;
        const overdue = item.status === 'STORED' && isItemOverdue(item.receivedAt);
        const dateStr = new Date(item.receivedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        return (
          <div key={item.id} className="p-4 bg-[var(--lf-canvas)] border border-[var(--lf-border)] rounded-[var(--lf-radius-md)] flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-[var(--lf-ink)]">{item.name}</h3>
                <p className="text-xs text-[var(--lf-muted)] mt-0.5">{item.inventoryCode} · {dateStr}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant={cfg.variant}>{cfg.label}</Badge>
                {overdue && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--lf-warning)] bg-[var(--lf-warning-soft)] px-2 py-0.5 rounded-full">
                    <AlertTriangle className="w-2.5 h-2.5" /> Overdue
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[var(--lf-border)]">
              <span className="text-xs text-[var(--lf-muted)]">
                Katalog: {item.isVisible ? 'Tampil' : 'Tersembunyi'}
              </span>
              <Button variant="secondary" size="sm" onClick={() => onDetailClick(item.id)} className="text-xs">
                Detail inventaris
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
