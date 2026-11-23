import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { FoundItem } from '@/types/domain';
import { Badge, BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { isItemOverdue } from '../selectors/inventorySelectors';
import { InventoryEmptyState } from './InventoryEmptyState';

export interface InventoryTableProps {
  items: FoundItem[];
  isLoading: boolean;
  onDetailClick: (id: string) => void;
  archivedOnly?: boolean;
  activeUnarchivedCount?: number;
  onResetArchiveFilter?: () => void;
}

const statusMap: Record<FoundItem['status'], { variant: BadgeVariant; label: string }> = {
  STORED: { variant: 'available', label: 'Tersedia di pos' },
  RETURNED_TO_OWNER: { variant: 'returned', label: 'Sudah diserahkan' },
  DISTRIBUTED: { variant: 'neutral', label: 'Disalurkan' },
};

export const InventoryTable: React.FC<InventoryTableProps> = ({
  items,
  isLoading,
  onDetailClick,
  archivedOnly = false,
  activeUnarchivedCount = 0,
  onResetArchiveFilter,
}) => {
  if (isLoading) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} height={48} className="w-full" />)}</div>;
  }
  if (items.length === 0) {
    return (
      <InventoryEmptyState
        archivedOnly={archivedOnly}
        activeUnarchivedCount={activeUnarchivedCount}
        onResetArchiveFilter={onResetArchiveFilter}
        defaultMessage="Tidak ada barang inventaris yang sesuai dengan filter."
        className="hidden sm:flex"
      />
    );
  }
  return (
    <div className="hidden sm:block overflow-x-auto border border-[var(--lf-border)] rounded-[var(--lf-radius-lg)] bg-[var(--lf-canvas)]">
      <table className="w-full text-left text-sm">
        <thead className="bg-[var(--lf-surface)] border-b border-[var(--lf-border)] text-xs text-[var(--lf-muted)] font-semibold">
          <tr>
            <th className="px-4 py-3">Barang</th>
            <th className="px-4 py-3">Kode inventaris</th>
            <th className="px-4 py-3">Tanggal diterima</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Katalog</th>
            <th className="px-4 py-3 text-right">Tindakan</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--lf-border)]">
          {items.map((item) => {
            const cfg = statusMap[item.status] || statusMap.STORED;
            const overdue = item.status === 'STORED' && isItemOverdue(item);
            const dateStr = new Date(item.receivedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
            return (
              <tr key={item.id} className="hover:bg-[var(--lf-surface)] transition-colors">
                <td className="px-4 py-3 font-medium text-[var(--lf-ink)]">
                  <div>{item.name}</div>
                  <div className="text-xs text-[var(--lf-muted)] font-normal">{item.category}</div>
                </td>
                <td className="px-4 py-3 text-xs font-mono text-[var(--lf-muted)] whitespace-nowrap">{item.inventoryCode}</td>
                <td className="px-4 py-3 text-xs text-[var(--lf-muted)] whitespace-nowrap">{dateStr}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 whitespace-nowrap flex-wrap">
                    <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    {Boolean(item.archivedAt) && (
                      <Badge variant="neutral" dot={false}>Diarsipkan</Badge>
                    )}
                    {overdue && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100/80 border border-amber-200 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                        <AlertTriangle className="w-3 h-3 text-amber-600" /> Overdue
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3"><Badge variant={item.isVisible ? 'available' : 'neutral'}>{item.isVisible ? 'Tampil' : 'Tersembunyi'}</Badge></td>
                <td className="px-4 py-3 text-right"><Button variant="secondary" size="sm" onClick={() => onDetailClick(item.id)}>Detail</Button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
