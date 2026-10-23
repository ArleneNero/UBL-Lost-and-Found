import React from 'react';
import { clsx } from 'clsx';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastProps {
  id: string;
  type?: ToastType;
  message: string;
  onDismiss?: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({
  id,
  type = 'info',
  message,
  onDismiss,
}) => {
  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-[var(--lf-success)] shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-[var(--lf-error)] shrink-0" />,
    info: <Info className="w-5 h-5 text-[var(--lf-action)] shrink-0" />,
  };

  const bgStyles = {
    success: 'bg-[var(--lf-success-soft)] border-[rgba(15,151,61,0.2)] text-[var(--lf-ink)]',
    error: 'bg-[var(--lf-error-soft)] border-[rgba(217,45,32,0.2)] text-[var(--lf-ink)]',
    info: 'bg-[var(--lf-soft)] border-[rgba(11,94,215,0.2)] text-[var(--lf-ink)]',
  };

  return (
    <div
      role="status"
      className={clsx(
        'flex items-center justify-between gap-3 px-4 py-3 rounded-[12px] border shadow-[0_4px_12px_rgba(16,24,40,0.08)] min-w-[280px] max-w-md',
        bgStyles[type]
      )}
    >
      <div className="flex items-center gap-2.5">
        {icons[type]}
        <span className="text-sm font-medium">{message}</span>
      </div>
      {onDismiss && (
        <button
          onClick={() => onDismiss(id)}
          className="p-1 rounded-md text-[var(--lf-muted)] hover:bg-black/5 cursor-pointer"
          aria-label="Tutup notifikasi"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
