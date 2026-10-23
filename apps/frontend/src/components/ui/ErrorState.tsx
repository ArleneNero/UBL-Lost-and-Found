import React from 'react';
import { clsx } from 'clsx';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Gagal Memuat Data',
  description = 'Terjadi kesalahan saat memuat konten. Silakan coba beberapa saat lagi.',
  onRetry,
  className,
}) => {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center p-8 text-center bg-white rounded-[16px] border border-[var(--lf-border)]',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-[var(--lf-error-soft)] text-[var(--lf-error)] flex items-center justify-center mb-4">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-[var(--lf-ink)] mb-1">{title}</h3>
      <p className="text-sm text-[var(--lf-muted)] max-w-sm mb-6">{description}</p>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<RefreshCw className="w-4 h-4" />}
          onClick={onRetry}
        >
          Muat Ulang
        </Button>
      )}
    </div>
  );
};
