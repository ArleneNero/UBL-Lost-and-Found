import { useState, useEffect, useCallback } from 'react';
import { FoundItem } from '@/types/domain';
import { services } from '@/services/registry';

export interface UseOfficerItemDetailReturn {
  item: FoundItem | null;
  isLoading: boolean;
  error: string | null;
  isUpdating: boolean;
  isSubmitting: boolean;
  toggleVisibility: () => Promise<void>;
  returnItem: (recipientName: string, verificationSummary: string) => Promise<FoundItem>;
  distributeItem: (notes: string) => Promise<FoundItem>;
  refetch: () => Promise<void>;
}

export function useOfficerItemDetail(id: string | undefined): UseOfficerItemDetailReturn {
  const [item, setItem] = useState<FoundItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!id) { setError('ID barang tidak valid'); setIsLoading(false); return; }
    setIsLoading(true); setError(null);
    try {
      const res = await services.items.getItemById(id);
      if (!res) setError('Barang inventaris tidak ditemukan');
      else setItem(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat detail barang');
    } finally { setIsLoading(false); }
  }, [id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const toggleVisibility = useCallback(async () => {
    if (!item) return;
    setIsUpdating(true);
    try {
      const updated = await services.items.updateVisibility(item.id, !item.isVisible);
      setItem(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui visibilitas');
    } finally { setIsUpdating(false); }
  }, [item]);

  const returnItem = useCallback(async (recipient: string, summary: string) => {
    if (!item) throw new Error('Barang tidak ditemukan');
    setIsSubmitting(true);
    try {
      const updated = await services.items.returnItem(item.id, recipient, summary);
      setItem(updated);
      return updated;
    } finally { setIsSubmitting(false); }
  }, [item]);

  const distributeItem = useCallback(async (notes: string) => {
    if (!item) throw new Error('Barang tidak ditemukan');
    setIsSubmitting(true);
    try {
      const updated = await services.items.distributeItem(item.id, notes);
      setItem(updated);
      return updated;
    } finally { setIsSubmitting(false); }
  }, [item]);

  return {
    item, isLoading, error, isUpdating, isSubmitting,
    toggleVisibility, returnItem, distributeItem, refetch: fetchDetail,
  };
}
