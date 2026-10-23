import { useState, useEffect, useCallback, useMemo } from 'react';
import { FoundItem } from '@/types/domain';
import { ItemStatus } from '@/types/api';
import { services } from '@/services/registry';
import {
  filterAndSortInventory,
  InventoryFilterOptions,
} from '../selectors/inventorySelectors';

export interface UseOfficerInventoryReturn {
  items: FoundItem[];
  filteredItems: FoundItem[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: ItemStatus | 'ALL';
  setStatusFilter: (status: ItemStatus | 'ALL') => void;
  sortBy: 'newest' | 'oldest';
  setSortBy: (sort: 'newest' | 'oldest') => void;
  refetch: () => Promise<void>;
}

export function useOfficerInventory(): UseOfficerInventoryReturn {
  const [items, setItems] = useState<FoundItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ItemStatus | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  const fetchInventory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await services.items.getOfficerItems({ limit: 100 });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat inventaris');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const filteredItems = useMemo(() => {
    const opts: InventoryFilterOptions = {
      search: searchQuery,
      status: statusFilter,
      sortBy,
    };
    return filterAndSortInventory(items, opts);
  }, [items, searchQuery, statusFilter, sortBy]);

  return {
    items,
    filteredItems,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    refetch: fetchInventory,
  };
}
