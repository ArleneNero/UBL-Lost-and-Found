import { FoundItem, Submission } from '@/types/domain';

export interface DashboardMetrics {
  totalStored: number;
  totalReturned: number;
  totalPendingReports: number;
}

/**
 * Menghitung metrik ringkasan operasional dashboard dari data inventaris dan laporan
 */
export function selectDashboardMetrics(
  items: FoundItem[],
  submissions: Submission[]
): DashboardMetrics {
  const totalStored = items.filter((i) => i.status === 'STORED').length;
  const totalReturned = items.filter((i) => i.status === 'RETURNED_TO_OWNER').length;
  const totalPendingReports = submissions.filter(
    (s) => s.status === 'PENDING_RECEIPT'
  ).length;

  return {
    totalStored,
    totalReturned,
    totalPendingReports,
  };
}

/**
 * Mengambil daftar barang inventaris terbaru
 */
export function selectRecentItems(items: FoundItem[], limit = 5): FoundItem[] {
  return [...items]
    .sort(
      (a, b) =>
        new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
    )
    .slice(0, limit);
}
