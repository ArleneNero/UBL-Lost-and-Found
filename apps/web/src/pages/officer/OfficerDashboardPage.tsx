import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { RoutePaths } from '@/constants/routes';
import { ErrorState } from '@/components/ui/ErrorState';
import { Button } from '@/components/ui/Button';
import { useOfficerDashboard } from '@/features/officer/hooks/useOfficerDashboard';
import {
  DashboardMetricsSection,
  DashboardSearchActions,
  DashboardRecentTable,
} from '@/features/officer/components';

export const OfficerDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    metrics,
    filteredRecentItems,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    refetch,
  } = useOfficerDashboard();

  if (error) {
    return (
      <div className="py-8">
        <ErrorState
          title="Gagal Memuat Dashboard"
          description={error}
          onRetry={refetch}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header Section */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--lf-ink)]">
            <span className="sm:hidden">Dashboard</span>
            <span className="hidden sm:inline">Dashboard Pengajaran</span>
          </h1>
          <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--lf-soft)] text-[var(--lf-action)]">
            Petugas Pengajaran
          </span>
        </div>
        <p className="text-xs sm:text-sm text-[var(--lf-muted)]">
          <span className="sm:hidden">Pencatatan barang unit Pengajaran.</span>
          <span className="hidden sm:inline">
            Kelola barang temuan dengan cepat. Ringkasan dan tindakan untuk barang yang berada di pos Pengajaran.
          </span>
        </p>
      </div>

      {/* Metrics Section */}
      <DashboardMetricsSection metrics={metrics} isLoading={isLoading} />

      {/* Search & Action Section */}
      <DashboardSearchActions
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onRegisterClick={() => navigate(RoutePaths.OFFICER_REGISTER_ITEM)}
      />

      {/* Recent Inventory Section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-[var(--lf-ink)]">
            <span className="sm:hidden">Barang terbaru</span>
            <span className="hidden sm:inline">Inventaris terbaru</span>
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(RoutePaths.OFFICER_INVENTORY)}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Lihat Semua
          </Button>
        </div>

        <DashboardRecentTable
          items={filteredRecentItems}
          isLoading={isLoading}
          onDetailClick={(id) => navigate(`/petugas/inventaris/${id}`)}
        />
      </div>
    </div>
  );
};
