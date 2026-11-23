import { FoundItem } from '@/types/domain';
import { DEFAULT_STORAGE_LIMIT_DAYS, isItemOverdue } from './inventorySelectors';
import { toLocalDateKey } from './reportDateSelectors';

export interface InventoryReportSummary {
  total: number;
  stored: number;
  returned: number;
  distributed: number;
  overdue: number;
  byCategory: Array<{ category: string; count: number }>;
}

export function filterItemsByReportRange(
  items: FoundItem[],
  startDate: string,
  endDate: string,
  statusFilter?: string
): FoundItem[] {
  const [rangeStart, rangeEnd] = startDate <= endDate ? [startDate, endDate] : [endDate, startDate];

  return items.filter((item) => {
    const dateKey = toLocalDateKey(item.receivedAt);
    if (!dateKey || dateKey < rangeStart || dateKey > rangeEnd) return false;
    if (statusFilter && statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    return true;
  });
}

export function summarizeInventoryReport(
  items: FoundItem[],
  storageLimitDays = DEFAULT_STORAGE_LIMIT_DAYS
): InventoryReportSummary {
  let stored = 0;
  let returned = 0;
  let distributed = 0;
  let overdue = 0;
  const categoryCounts = new Map<string, number>();

  for (const item of items) {
    if (item.status === 'STORED') {
      stored += 1;
      if (isItemOverdue(item, storageLimitDays)) overdue += 1;
    } else if (item.status === 'RETURNED_TO_OWNER') {
      returned += 1;
    } else if (item.status === 'DISTRIBUTED') {
      distributed += 1;
    }

    const cat = item.category?.trim() || 'Lainnya';
    categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
  }

  const byCategory = Array.from(categoryCounts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));

  return { total: items.length, stored, returned, distributed, overdue, byCategory };
}
