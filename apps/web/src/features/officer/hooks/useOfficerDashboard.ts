import { useState, useCallback } from 'react';
import { FoundItem } from '@/types/domain';
import { DashboardMetrics } from '../selectors/dashboardSelectors';

export interface UseOfficerDashboardReturn {
  metrics: DashboardMetrics;
  recentItems: FoundItem[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredRecentItems: FoundItem[];
  refetch: () => Promise<void>;
}

export function useOfficerDashboard(): UseOfficerDashboardReturn {
  const [items] = useState<FoundItem[]>([]);
  const [metrics] = useState<DashboardMetrics>({
    totalStored: 0,
    totalReturned: 0,
    totalPendingReports: 0,
  });
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const refetch = useCallback(async () => {}, []);

  return {
    metrics,
    recentItems: items,
    filteredRecentItems: items,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    refetch,
  };
}
