import React, { useState } from 'react';
import { MapPin, Package } from 'lucide-react';
import { FoundItem } from '@/types/domain';

interface PublicItemCardProps {
  item: FoundItem;
  onClick: () => void;
}

export const PublicItemCard: React.FC<PublicItemCardProps> = ({ item, onClick }) => {
  const [imgError, setImgError] = useState(false);
  const dateSource = item.receivedAt || item.foundDate;
  const dateStr = new Date(dateSource).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

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
      <div className="relative aspect-4/3 w-full bg-slate-100/80 overflow-hidden flex items-center justify-center">
        {/* Category Pill Badge (Item B.1 & B.4) */}
        {item.category && (
          <div className="absolute top-2.5 left-2.5 z-10 bg-white/95 backdrop-blur-xs text-[11px] font-semibold text-[#344054] px-2.5 py-0.5 rounded-full shadow-2xs border border-[#D0D5DD]/70">
            {item.category}
          </div>
        )}
        {imgError || !item.photoUrl ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50/60 text-[var(--lf-muted)] gap-1.5 p-4">
            <div className="w-10 h-10 rounded-xl bg-white shadow-2xs border border-[#E4E7EC] flex items-center justify-center text-[#1570EF]">
              <Package className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{item.category}</span>
          </div>
        ) : (
          <img
            src={item.photoUrl}
            alt={item.name}
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-contain p-2 group-hover:scale-102 transition-transform duration-200"
          />
        )}
      </div>

      <div className="p-3 sm:p-4 flex flex-col gap-1.5 flex-1 justify-between">
        <h3 className="text-xs sm:text-sm font-bold text-[var(--lf-ink)] group-hover:text-[var(--lf-action)] transition-colors truncate">
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

