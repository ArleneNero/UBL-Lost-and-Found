import React from 'react';
import { FoundItem } from '@/types/domain';
import { Badge, BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { DashboardItemCard } from './DashboardItemCard';

export interface DashboardRecentTableProps {
  items: FoundItem[];
  isLoading: boolean;
  onDetailClick: (id: string) => void;
}

const statusMap: Record<FoundItem['status'], { variant: BadgeVariant; label: string }> = {
  STORED: { variant: 'available', label: 'Tersedia di pos' },
  RETURNED_TO_OWNER: { variant: 'returned', label: 'Sudah diserahkan' },
  DISTRIBUTED: { variant: 'neutral', label: 'Disalurkan' },
};

export const DashboardRecentTable: React.FC<DashboardRecentTableProps> = ({
  items,
  isLoading,
  onDetailClick,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} height={48} className="w-full" />)}
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="text-center py-8 bg-[var(--lf-canvas)] border border-[var(--lf-border)] rounded-[var(--lf-radius-lg)]">
        <p className="text-sm text-[var(--lf-muted)]">Tidak ada barang inventaris yang ditemukan.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2.5 sm:hidden">
        {items.map((item) => (
          <DashboardItemCard key={item.id} item={item} onDetailClick={onDetailClick} />
        ))}
      </div>
      <div className="hidden sm:block overflow-x-auto border border-[var(--lf-border)] rounded-[var(--lf-radius-lg)] bg-[var(--lf-canvas)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--lf-surface)] border-b border-[var(--lf-border)] text-xs text-[var(--lf-muted)] font-semibold">
            <tr>
              <th className="px-4 py-3">Barang</th>
              <th className="px-4 py-3">Kode inventaris</th>
              <th className="px-4 py-3">Tanggal diterima</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Tindakan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--lf-border)]">
            {items.map((item) => {
              const cfg = statusMap[item.status] || statusMap.STORED;
              const dateStr = new Date(item.receivedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
              return (
                <tr key={item.id} className="hover:bg-[var(--lf-surface)] transition-colors">
                  <td className="px-4 py-3 font-medium text-[var(--lf-ink)]">{item.name}</td>
                  <td className="px-4 py-3 text-xs font-mono text-[var(--lf-muted)]">{item.inventoryCode}</td>
                  <td className="px-4 py-3 text-xs text-[var(--lf-muted)]">{dateStr}</td>
                  <td className="px-4 py-3"><Badge variant={cfg.variant}>{cfg.label}</Badge></td>
                  <td className="px-4 py-3 text-right"><Button variant="secondary" size="sm" onClick={() => onDetailClick(item.id)}>Detail</Button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
