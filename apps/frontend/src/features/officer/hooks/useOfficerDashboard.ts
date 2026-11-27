import { useState, useEffect, useCallback } from 'react';
import { FoundItem } from '@/types/domain';
import { services } from '@/services/registry';
import { fetchAllPages } from '@/utils/pagination';
import {
  selectDashboardMetrics,
  selectRecentItems,
  DashboardMetrics,
} from '../selectors/dashboardSelectors';

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
  const [items, setItems] = useState<FoundItem[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalStored: 0,
    totalReturned: 0,
    totalPendingReports: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [allItems, allSubmissions] = await Promise.all([
        fetchAllPages((page) => services.items.getOfficerItems({ page, limit: 100 })),
        fetchAllPages((page) => services.submissions.getOfficerSubmissions({ page, limit: 100 })),
      ]);

      setItems(allItems);
      const computed = selectDashboardMetrics(allItems, allSubmissions);
      setMetrics(computed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data dashboard');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const recentItems = selectRecentItems(items, 5);

  const filteredRecentItems = searchQuery.trim()
    ? recentItems.filter(
        (i) =>
          i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          i.inventoryCode.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : recentItems;

  return {
    metrics,
    recentItems,
    filteredRecentItems,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    refetch: loadDashboardData,
  };
}
