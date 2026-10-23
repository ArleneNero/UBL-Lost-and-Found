import { FoundItem } from '@/types/domain';
import { ItemStatus } from '@/types/api';

export const DEFAULT_STORAGE_LIMIT_DAYS = 30;

export function getDaysStored(receivedAt: string): number {
  const received = new Date(receivedAt).getTime();
  const now = Date.now();
  const diff = now - received;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export function isItemOverdue(
  receivedAt: string,
  storageLimitDays = DEFAULT_STORAGE_LIMIT_DAYS
): boolean {
  return getDaysStored(receivedAt) > storageLimitDays;
}

export interface InventoryFilterOptions {
  search?: string;
  status?: ItemStatus | 'ALL';
  sortBy?: 'newest' | 'oldest';
}

export function filterAndSortInventory(
  items: FoundItem[],
  options: InventoryFilterOptions
): FoundItem[] {
  let result = [...items];

  if (options.status && options.status !== 'ALL') {
    result = result.filter((i) => i.status === options.status);
  }

  if (options.search?.trim()) {
    const q = options.search.toLowerCase().trim();
    result = result.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.inventoryCode.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        (i.foundLocation && i.foundLocation.toLowerCase().includes(q))
    );
  }

  result.sort((a, b) => {
    const timeA = new Date(a.receivedAt).getTime();
    const timeB = new Date(b.receivedAt).getTime();
    return options.sortBy === 'oldest' ? timeA - timeB : timeB - timeA;
  });

  return result;
}
