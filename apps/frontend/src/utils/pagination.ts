import { PaginatedResult } from '@/types/domain';

const MAX_SAFE_PAGES = 100;

/**
 * Mengambil seluruh halaman secara berurutan dari endpoint terpaginasi
 * untuk kebutuhan agregasi metrik/daftar lengkap tanpa terpotong limit halaman pertama.
 */
export async function fetchAllPages<T>(
  fetchPage: (page: number) => Promise<PaginatedResult<T>>
): Promise<T[]> {
  const collected: T[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= MAX_SAFE_PAGES) {
    const res = await fetchPage(page);
    collected.push(...res.items);
    totalPages = res.totalPages > 0 ? res.totalPages : 1;
    if (res.items.length === 0) {
      break;
    }
    page += 1;
  }

  return collected;
}
