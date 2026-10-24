import React from 'react';
import { MapPin } from 'lucide-react';
import { FoundItem } from '@/types/domain';

interface PublicItemCardProps {
  item: FoundItem;
  onClick: () => void;
}

export const PublicItemCard: React.FC<PublicItemCardProps> = ({ item, onClick }) => {
  const dateStr = item.foundDate
    ? new Date(item.foundDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    : new Date(item.receivedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  // Clean short pos name (e.g. "Pos Pengajaran" -> "Pengajaran")
  const shortPos = item.postName?.replace(/^Pos\s+/i, '') || 'Pengajaran';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="bg-white rounded-2xl border border-[var(--lf-border)] overflow-hidden cursor-pointer group hover:border-[var(--lf-action)] hover:shadow-xs transition-all duration-150 flex flex-col select-none"
    >
      <div className="relative aspect-4/3 w-full bg-[var(--lf-surface)] overflow-hidden">
        <img
          src={item.photoUrl}
          alt={item.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
        />
      </div>

      <div className="p-4 flex flex-col gap-1.5 flex-1 justify-between">
        <h3 className="text-sm font-bold text-[var(--lf-ink)] group-hover:text-[var(--lf-action)] transition-colors truncate">
          {item.name}
        </h3>
        
        <div className="flex flex-col gap-1 pt-1 text-xs">
          <div className="flex items-center gap-1.5 text-[var(--lf-action)] font-medium">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{shortPos}</span>
          </div>
          <span className="text-[11px] text-[var(--lf-muted)]">
            Diterima {dateStr}
          </span>
        </div>
      </div>
    </div>
  );
};

