import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  includeArchived: boolean;
  setIncludeArchived: (include: boolean) => void;
  cleanArchive: (month?: string) => Promise<number>;
  refetch: () => Promise<void>;
}

function resolveInitialItemStatus(raw: string | null): ItemStatus | 'ALL' {
  if (!raw) return 'ALL';
  const normalized = raw.trim().toUpperCase();
  if (normalized === 'STORED' || normalized === 'TERSEDIA') return 'STORED';
  if (normalized === 'RETURNED_TO_OWNER' || normalized === 'DISERAHKAN') return 'RETURNED_TO_OWNER';
  if (normalized === 'DISTRIBUTED' || normalized === 'DISALURKAN') return 'DISTRIBUTED';
  return 'ALL';
}

export function useOfficerInventory(): UseOfficerInventoryReturn {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<FoundItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilterState] = useState<ItemStatus | 'ALL'>(() =>
    resolveInitialItemStatus(searchParams.get('status'))
  );
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [includeArchived, setIncludeArchived] = useState(false);

  useEffect(() => {
    setStatusFilterState(resolveInitialItemStatus(searchParams.get('status')));
  }, [searchParams]);

  const setStatusFilter = useCallback(
    (nextStatus: ItemStatus | 'ALL') => {
      setStatusFilterState(nextStatus);
      const next = new URLSearchParams(searchParams);
      if (nextStatus === 'ALL') {
        next.delete('status');
      } else {
        next.set('status', nextStatus);
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const fetchInventory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await services.items.getOfficerItems({ limit: 100, includeArchived });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat inventaris');
    } finally {
      setIsLoading(false);
    }
  }, [includeArchived]);

  const cleanArchive = useCallback(
    async (month?: string): Promise<number> => {
      const res = await services.items.cleanCompletedInventory(month);
      await fetchInventory();
      return res.archivedCount;
    },
    [fetchInventory]
  );

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
    includeArchived,
    setIncludeArchived,
    cleanArchive,
    refetch: fetchInventory,
  };
}
