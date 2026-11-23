import { useState, useEffect, useCallback } from 'react';
import { services } from '@/services/registry';
import { DEFAULT_STORAGE_LIMIT_DAYS } from '../selectors/inventorySelectors';

export function useStoragePolicy() {
  const [savedDays, setSavedDays] = useState<number>(DEFAULT_STORAGE_LIMIT_DAYS);
  const [draftDays, setDraftDays] = useState<string>(String(DEFAULT_STORAGE_LIMIT_DAYS));
  const [confirmed, setConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await services.items.getPostSettings();
      setSavedDays(res.storageLimitDays);
      setDraftDays(String(res.storageLimitDays));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat kebijakan batas simpan.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const parsedDays = Number(draftDays);
  const isValid = Number.isInteger(parsedDays) && parsedDays >= 1 && parsedDays <= 730;
  const isDirty = isValid && parsedDays !== savedDays;

  const savePolicy = async () => {
    if (!isValid || !confirmed) return;
    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const updated = await services.items.updatePostSettings(parsedDays);
      setSavedDays(updated.storageLimitDays);
      setDraftDays(String(updated.storageLimitDays));
      setConfirmed(false);
      setSuccessMsg(`Batas simpan pos diperbarui menjadi ${updated.storageLimitDays} hari (berlaku untuk barang baru).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan kebijakan batas simpan.');
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefault = () => {
    setDraftDays(String(DEFAULT_STORAGE_LIMIT_DAYS));
    setError(null);
    setSuccessMsg(null);
  };

  return {
    savedDays, draftDays, setDraftDays, confirmed, setConfirmed,
    isLoading, isSaving, isValid, isDirty, error, successMsg, savePolicy, resetToDefault,
  };
}
