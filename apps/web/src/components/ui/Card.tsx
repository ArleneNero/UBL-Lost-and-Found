import React from 'react';
import { clsx } from 'clsx';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  hoverable = false,
  className,
  ...props
}) => {
  return (
    <div
      className={clsx(
        'bg-white rounded-[16px] border border-[var(--lf-border)] p-5 shadow-[0_2px_8px_rgba(16,24,40,0.04)]',
        hoverable && 'transition-all duration-200 hover:shadow-[0_8px_20px_rgba(16,24,40,0.08)] hover:border-[#D0D5DD]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
