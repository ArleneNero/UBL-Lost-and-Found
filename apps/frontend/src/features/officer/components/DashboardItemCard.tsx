import React from 'react';
import { FoundItem } from '@/types/domain';
import { Badge, BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export interface DashboardItemCardProps {
  item: FoundItem;
  onDetailClick: (id: string) => void;
}

export const DashboardItemCard: React.FC<DashboardItemCardProps> = ({
  item,
  onDetailClick,
}) => {
  const isStored = item.status === 'STORED';
  const badgeVariant: BadgeVariant = isStored
    ? 'available'
    : item.status === 'RETURNED_TO_OWNER'
    ? 'returned'
    : 'neutral';
  const badgeLabel = isStored
    ? 'Tersedia di pos'
    : item.status === 'RETURNED_TO_OWNER'
    ? 'Sudah diserahkan'
    : 'Disalurkan';

  const formattedDate = new Date(item.receivedAt).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="p-4 bg-[var(--lf-canvas)] border border-[var(--lf-border)] rounded-[var(--lf-radius-md)] flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[var(--lf-ink)]">{item.name}</h3>
          <p className="text-xs text-[var(--lf-muted)] mt-0.5">
            {item.inventoryCode} · {formattedDate}
          </p>
        </div>
        <Badge variant={badgeVariant}>{badgeLabel}</Badge>
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onDetailClick(item.id)}
        className="w-full text-xs"
      >
        Detail inventaris
      </Button>
    </div>
  );
};
