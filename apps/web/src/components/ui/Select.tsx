import React from 'react';
import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, className, id, ...props }, ref) => {
    const selectId = id || React.useId();

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-[var(--lf-ink)]">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <select
            id={selectId}
            ref={ref}
            className={clsx(
              'w-full h-[48px] bg-white text-sm text-[var(--lf-ink)] px-4 pr-10 appearance-none',
              'border rounded-[12px] transition-colors duration-150 cursor-pointer',
              'focus:outline-none focus:ring-2 focus:ring-offset-1',
              error
                ? 'border-[var(--lf-error)] focus:ring-[var(--lf-error)]'
                : 'border-[var(--lf-border)] focus:border-[var(--lf-blue)] focus:ring-[var(--lf-blue)]',
              className
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3.5 flex items-center pointer-events-none text-[var(--lf-muted)]">
            <ChevronDown className="w-4 h-4" />
          </div>
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

Select.displayName = 'Select';
