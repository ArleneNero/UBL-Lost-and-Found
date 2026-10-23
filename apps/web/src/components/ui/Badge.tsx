import React from 'react';
import { clsx } from 'clsx';

export type BadgeVariant = 'available' | 'pending' | 'returned' | 'rejected' | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'available',
  dot = true,
  className,
  ...props
}) => {
  const variantStyles = {
    available: 'bg-[var(--lf-success-soft)] text-[var(--lf-success)] border border-[rgba(15,151,61,0.2)]',
    pending: 'bg-[var(--lf-warning-soft)] text-[var(--lf-warning)] border border-[rgba(181,71,8,0.2)]',
    returned: 'bg-[var(--lf-soft)] text-[var(--lf-action)] border border-[rgba(11,94,215,0.2)]',
    rejected: 'bg-[var(--lf-error-soft)] text-[var(--lf-error)] border border-[rgba(217,45,32,0.2)]',
    neutral: 'bg-[#F2F4F7] text-[var(--lf-muted)] border border-[var(--lf-border)]',
  };

  const dotStyles = {
    available: 'bg-[var(--lf-success)]',
    pending: 'bg-[var(--lf-warning)]',
    returned: 'bg-[var(--lf-action)]',
    rejected: 'bg-[var(--lf-error)]',
    neutral: 'bg-[var(--lf-muted)]',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 h-[28px] px-3 rounded-full text-xs font-semibold select-none',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', dotStyles[variant])} />}
      <span>{children}</span>
    </span>
  );
};
