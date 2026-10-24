import { useState, useEffect, useCallback } from 'react';
import { FoundItem } from '@/types/domain';
import { services } from '@/services/registry';

export interface UsePublicCatalogReturn {
  items: FoundItem[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  categoryFilter: string;
  setCategoryFilter: (cat: string) => void;
  sortOrder: 'newest' | 'oldest';
  setSortOrder: (s: 'newest' | 'oldest') => void;
  postIdFilter: number | undefined;
  setPostIdFilter: (id: number | undefined) => void;
  page: number;
  setPage: (p: number) => void;
  totalPages: number;
  totalItems: number;
  refetch: () => Promise<void>;
}

export function usePublicCatalog(initialLimit = 10): UsePublicCatalogReturn {
  const [items, setItems] = useState<FoundItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [postIdFilter, setPostIdFilter] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await services.items.getItems({
        search: searchQuery.trim() || undefined,
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        postId: postIdFilter,
        sort: sortOrder,
        page,
        limit: initialLimit,
      });
      setItems(res.items);
      setTotalPages(Math.max(1, res.totalPages));
      setTotalItems(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat katalog barang');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, categoryFilter, postIdFilter, sortOrder, page, initialLimit]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    setPage(1);
  };

  const handleCategoryChange = (cat: string) => {
    setCategoryFilter(cat);
    setPage(1);
  };

  const handleSortChange = (s: 'newest' | 'oldest') => {
    setSortOrder(s);
    setPage(1);
  };

  const handlePostChange = (id: number | undefined) => {
    setPostIdFilter(id);
    setPage(1);
  };

  return {
    items,
    isLoading,
    error,
    searchQuery,
    setSearchQuery: handleSearchChange,
    categoryFilter,
    setCategoryFilter: handleCategoryChange,
    sortOrder,
    setSortOrder: handleSortChange,
    postIdFilter,
    setPostIdFilter: handlePostChange,
    page,
    setPage,
    totalPages,
    totalItems,
    refetch: fetchItems,
  };
}
