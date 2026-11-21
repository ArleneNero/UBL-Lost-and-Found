import React from 'react';
import { Package, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { DashboardMetrics } from '../selectors/dashboardSelectors';

export interface DashboardMetricsSectionProps {
  metrics: DashboardMetrics;
  isLoading: boolean;
  onStoredClick?: () => void;
  onReturnedClick?: () => void;
  onPendingReportsClick?: () => void;
}

export const DashboardMetricsSection: React.FC<DashboardMetricsSectionProps> = ({
  metrics,
  isLoading,
  onStoredClick,
  onReturnedClick,
  onPendingReportsClick,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="flex items-center gap-4 p-4">
            <Skeleton variant="circular" width={48} height={48} />
            <div className="space-y-2 flex-1">
              <Skeleton variant="text" width="60%" />
              <Skeleton variant="text" width="40%" height={24} />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Barang tersedia */}
      <Card
        onClick={onStoredClick}
        className={`flex items-center justify-between p-5 border-l-4 border-l-[var(--lf-action)] ${
          onStoredClick ? 'cursor-pointer hover:shadow-xs transition-all select-none group' : ''
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-[14px] bg-[var(--lf-soft)] text-[var(--lf-action)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-[var(--lf-muted)]">Barang tersedia</span>
            <div className="text-2xl font-bold text-[var(--lf-ink)]">{metrics.totalStored}</div>
          </div>
        </div>
        {onStoredClick && (
          <div className="flex items-center text-xs font-semibold text-[var(--lf-action)] group-hover:translate-x-0.5 transition-transform shrink-0">
            <span className="hidden sm:inline mr-1">Lihat</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        )}
      </Card>

      {/* Sudah diserahkan */}
      <Card
        onClick={onReturnedClick}
        className={`flex items-center justify-between p-5 border-l-4 border-l-[var(--lf-success)] ${
          onReturnedClick ? 'cursor-pointer hover:shadow-xs transition-all select-none group' : ''
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-[14px] bg-[var(--lf-success-soft)] text-[var(--lf-success)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-[var(--lf-muted)]">Sudah diserahkan</span>
            <div className="text-2xl font-bold text-[var(--lf-ink)]">{metrics.totalReturned}</div>
          </div>
        </div>
        {onReturnedClick && (
          <div className="flex items-center text-xs font-semibold text-[var(--lf-success)] group-hover:translate-x-0.5 transition-transform shrink-0">
            <span className="hidden sm:inline mr-1">Lihat</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        )}
      </Card>

      {/* Laporan menunggu */}
      <Card
        onClick={onPendingReportsClick}
        className={`flex items-center justify-between p-5 border-l-4 border-l-[var(--lf-warning)] ${
          onPendingReportsClick ? 'cursor-pointer hover:border-[var(--lf-warning)] hover:shadow-xs transition-all select-none group' : ''
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-[14px] bg-[var(--lf-warning-soft)] text-[var(--lf-warning)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-[var(--lf-muted)]">Laporan menunggu</span>
            <div className="text-2xl font-bold text-[var(--lf-ink)]">{metrics.totalPendingReports}</div>
            <div className="text-[11px] text-[var(--lf-muted)] mt-0.5">
              {metrics.totalPendingReports > 0 ? (
                <span className="text-[var(--lf-warning)] font-medium">Perlu verifikasi fisik</span>
              ) : (
                <span className="text-[var(--lf-muted)] font-normal">Tidak ada laporan menunggu</span>
              )}
            </div>
          </div>
        </div>
        {onPendingReportsClick && (
          <div className="flex items-center text-xs font-semibold text-[var(--lf-warning)] group-hover:translate-x-0.5 transition-transform shrink-0">
            <span className="hidden sm:inline mr-1">Buka</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        )}
      </Card>
    </div>
  );
};