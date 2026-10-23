import React from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className,
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

  const sizeStyles = {
    sm: 'h-[36px] px-3 text-xs rounded-[10px] gap-1.5',
    md: 'h-[48px] px-5 text-sm rounded-[14px] gap-2',
    lg: 'h-[52px] px-6 text-base rounded-[14px] gap-2.5',
  };

  const variantStyles = {
    primary: 'btn-primary-gradient text-white focus-visible:ring-[var(--lf-blue)] shadow-sm disabled:bg-[#E4E7EC] disabled:text-[#98A2B3] disabled:bg-none',
    secondary: 'bg-white text-[var(--lf-ink)] border border-[var(--lf-border)] hover:bg-[#F9FAFB] focus-visible:ring-[var(--lf-border-strong)] active:bg-[#F2F4F7]',
    soft: 'bg-[var(--lf-soft)] text-[var(--lf-action)] hover:bg-[#DCEBFF] focus-visible:ring-[var(--lf-action)]',
    danger: 'bg-[var(--lf-error)] text-white hover:bg-[#B42318] focus-visible:ring-[var(--lf-error)]',
    ghost: 'bg-transparent text-[var(--lf-muted)] hover:bg-[#F2F4F7] hover:text-[var(--lf-ink)] focus-visible:ring-[var(--lf-muted)]',
  };

  return (
    <button
      className={clsx(
        baseStyles,
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && (
        <span className="inline-flex shrink-0">{rightIcon}</span>
      )}
    </button>
  );
};
