import React from 'react';
import { ChevronRight } from 'lucide-react';

interface RoleCardProps {
  title: string;
  description: string;
  iconSrc?: string;
  iconFallback?: React.ReactNode;
  iconBgColor?: string;
  onClick: () => void;
}

export const RoleCard: React.FC<RoleCardProps> = ({
  title,
  description,
  iconSrc,
  iconFallback,
  iconBgColor = 'bg-[var(--lf-soft)]',
  onClick,
}) => {
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
      className="bg-white rounded-2xl border border-[var(--lf-border)] p-4 flex items-center justify-between gap-3 cursor-pointer hover:border-[var(--lf-action)] hover:shadow-xs transition-all duration-150 select-none group min-h-[96px]"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className={`w-12 h-12 rounded-xl ${iconBgColor} flex items-center justify-center shrink-0 overflow-hidden`}>
          {iconSrc ? (
            <img src={iconSrc} alt={title} className="w-full h-full object-contain p-1" />
          ) : (
            iconFallback
          )}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-[var(--lf-ink)] group-hover:text-[var(--lf-action)] transition-colors truncate">
            {title}
          </h3>
          <p className="text-xs text-[var(--lf-muted)] line-clamp-2 mt-0.5 leading-snug">
            {description}
          </p>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-[var(--lf-muted)] shrink-0 group-hover:text-[var(--lf-action)] group-hover:translate-x-0.5 transition-transform" />
    </div>
  );
};

