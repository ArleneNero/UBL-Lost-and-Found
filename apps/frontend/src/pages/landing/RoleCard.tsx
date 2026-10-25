import React from 'react';
import { ChevronRight } from 'lucide-react';

interface RoleCardProps {
  title: string;
  description: string;
  iconSrc?: string;
  iconFallback?: React.ReactNode;
  iconBgColor?: string;
  badge?: string;
  disabled?: boolean;
  onClick?: () => void;
}

export const RoleCard: React.FC<RoleCardProps> = ({
  title,
  description,
  iconSrc,
  iconFallback,
  iconBgColor = 'bg-[var(--lf-soft)]',
  badge,
  disabled = false,
  onClick,
}) => {
  const handleClick = () => {
    if (!disabled && onClick) onClick();
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
      className={`bg-white rounded-2xl border border-[var(--lf-border)] p-4 flex items-center justify-between gap-3 select-none group min-h-[96px] ${
        disabled
          ? 'opacity-85 cursor-not-allowed'
          : 'cursor-pointer hover:border-[var(--lf-action)] hover:shadow-xs transition-all duration-150'
      }`}
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
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[var(--lf-ink)] group-hover:text-[var(--lf-action)] transition-colors truncate">
              {title}
            </h3>
            {badge && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                {badge}
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--lf-muted)] line-clamp-2 mt-0.5 leading-snug">
            {description}
          </p>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-[var(--lf-muted)] shrink-0 group-hover:text-[var(--lf-action)] group-hover:translate-x-0.5 transition-transform" />
    </div>
  );
};

