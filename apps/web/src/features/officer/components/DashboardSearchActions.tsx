import React from 'react';
import { PlusCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface DashboardSearchActionsProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onRegisterClick: () => void;
}

export const DashboardSearchActions: React.FC<DashboardSearchActionsProps> = ({
  searchQuery,
  onSearchChange,
  onRegisterClick,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--lf-muted)]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Cari nama atau kode inventaris Pengajaran..."
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-[var(--lf-canvas)] border border-[var(--lf-border)] rounded-[var(--lf-radius-md)] text-[var(--lf-ink)] placeholder-[var(--lf-muted)] focus:outline-none focus:border-[var(--lf-blue)] focus:ring-1 focus:ring-[var(--lf-blue)] transition-colors"
        />
      </div>
      <Button
        variant="primary"
        leftIcon={<PlusCircle className="w-4 h-4" />}
        onClick={onRegisterClick}
        className="shrink-0"
      >
        Catat Barang
      </Button>
    </div>
  );
};
