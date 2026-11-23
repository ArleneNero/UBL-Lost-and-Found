import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  archivedOnly: boolean;
  setArchivedOnly: (archivedOnly: boolean) => void;
  activeUnarchivedCount: number;
  activeCompletedItems: FoundItem[];
  cleanArchive: (month?: string) => Promise<number>;
  fetchAllForReport: () => Promise<FoundItem[]>;
  refetch: () => Promise<void>;
}

function isCompletedActiveItem(item: FoundItem): boolean {
  return (
    !item.archivedAt &&
    (item.status === 'RETURNED_TO_OWNER' || item.status === 'DISTRIBUTED')
  );
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
  const [archivedOnly, setArchivedOnly] = useState(false);
  const [activeUnarchivedCount, setActiveUnarchivedCount] = useState(0);
  const [activeCompletedItems, setActiveCompletedItems] = useState<FoundItem[]>([]);
  const hasActiveSnapshotRef = useRef(false);

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

  const fetchInventory = useCallback(
    async (forceSyncActive = false) => {
      setIsLoading(true);
      setError(null);
      try {
        if (!archivedOnly) {
          const res = await services.items.getOfficerItems({
            limit: 100,
            archivedOnly: false,
          });
          setItems(res.items);
          setActiveUnarchivedCount(
            typeof res.total === 'number' ? res.total : res.items.length
          );
          setActiveCompletedItems(res.items.filter(isCompletedActiveItem));
          hasActiveSnapshotRef.current = true;
        } else if (!hasActiveSnapshotRef.current || forceSyncActive) {
          const [archivedRes, activeRes] = await Promise.all([
            services.items.getOfficerItems({ limit: 100, archivedOnly: true }),
            services.items.getOfficerItems({ limit: 100, archivedOnly: false }),
          ]);
          setItems(archivedRes.items);
          setActiveUnarchivedCount(
            typeof activeRes.total === 'number'
              ? activeRes.total
              : activeRes.items.length
          );
          setActiveCompletedItems(activeRes.items.filter(isCompletedActiveItem));
          hasActiveSnapshotRef.current = true;
        } else {
          const archivedRes = await services.items.getOfficerItems({
            limit: 100,
            archivedOnly: true,
          });
          setItems(archivedRes.items);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat inventaris');
      } finally {
        setIsLoading(false);
      }
    },
    [archivedOnly]
  );

  const cleanArchive = useCallback(
    async (month?: string): Promise<number> => {
      const res = await services.items.cleanCompletedInventory(month);
      await fetchInventory(true);
      return res.archivedCount;
    },
    [fetchInventory]
  );

  const refetch = useCallback(async () => {
    await fetchInventory(true);
  }, [fetchInventory]);

  const fetchAllForReport = useCallback(async (): Promise<FoundItem[]> => {
    const collected: FoundItem[] = [];
    let page = 1;
    let totalPages = 1;
    while (page <= totalPages) {
      const res = await services.items.getOfficerItems({ page, limit: 100, includeArchived: true });
      collected.push(...res.items);
      totalPages = Math.max(1, res.totalPages || 1);
      page += 1;
    }
    return collected;
  }, []);

  useEffect(() => {
    void fetchInventory();
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
    archivedOnly,
    setArchivedOnly,
    activeUnarchivedCount,
    activeCompletedItems,
    cleanArchive,
    fetchAllForReport,
    refetch,
  };
}
