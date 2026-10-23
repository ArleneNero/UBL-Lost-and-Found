import React from 'react';
import { clsx } from 'clsx';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className, id, ...props }, ref) => {
    const inputId = id || React.useId();

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-[var(--lf-ink)]">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-[var(--lf-muted)]">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={clsx(
              'w-full h-[48px] bg-white text-sm text-[var(--lf-ink)] placeholder-[var(--lf-muted)]',
              'border rounded-[12px] transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-offset-1',
              leftIcon ? 'pl-10' : 'pl-4',
              rightIcon ? 'pr-10' : 'pr-4',
              error
                ? 'border-[var(--lf-error)] focus:ring-[var(--lf-error)] text-[var(--lf-error)]'
                : 'border-[var(--lf-border)] focus:border-[var(--lf-blue)] focus:ring-[var(--lf-blue)]',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 flex items-center text-[var(--lf-muted)]">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <span className="text-xs text-[var(--lf-error)] font-medium">{error}</span>
        ) : helperText ? (
          <span className="text-xs text-[var(--lf-muted)]">{helperText}</span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
