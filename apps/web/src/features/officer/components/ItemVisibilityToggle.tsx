import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export interface ItemVisibilityToggleProps {
  isVisible: boolean;
  isUpdating: boolean;
  onToggle: () => void;
}

export const ItemVisibilityToggle: React.FC<ItemVisibilityToggleProps> = ({
  isVisible,
  isUpdating,
  onToggle,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[var(--lf-surface)] border border-[var(--lf-border)] rounded-[var(--lf-radius-md)]">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--lf-ink)]">
            Visibilitas Katalog Publik
          </span>
          <Badge variant={isVisible ? 'available' : 'neutral'}>
            {isVisible ? 'Tampil' : 'Tersembunyi'}
          </Badge>
        </div>
        <p className="text-xs text-[var(--lf-muted)]">
          {isVisible
            ? 'Barang dapat dicari dan dilihat oleh umum di katalog Lost and Found.'
            : 'Barang tetap tersimpan di pos, namun disembunyikan dari katalog umum.'}
        </p>
      </div>

      <Button
        variant="secondary"
        size="sm"
        isLoading={isUpdating}
        leftIcon={isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        onClick={onToggle}
        className="shrink-0"
      >
        {isVisible ? 'Sembunyikan' : 'Tampilkan'}
      </Button>
    </div>
  );
};
