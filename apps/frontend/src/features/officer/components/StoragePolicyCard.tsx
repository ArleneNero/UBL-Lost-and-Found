import React from 'react';
import { Clock, RotateCcw, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useStoragePolicy } from '../hooks/useStoragePolicy';
import { DEFAULT_STORAGE_LIMIT_DAYS } from '../selectors/inventorySelectors';

export const StoragePolicyCard: React.FC = () => {
  const {
    savedDays, draftDays, setDraftDays, confirmed, setConfirmed,
    isLoading, isSaving, isValid, isDirty, error, successMsg, savePolicy, resetToDefault,
  } = useStoragePolicy();

  return (
    <Card className="p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[var(--lf-ink)] flex items-center gap-2">
            <Clock className="w-4 h-4 text-[var(--lf-action)]" /> Kebijakan Batas Simpan (Overdue)
          </h2>
          <p className="text-xs text-[var(--lf-muted)] mt-1">
            Standar baku Pos Pengajaran adalah <strong>{DEFAULT_STORAGE_LIMIT_DAYS} hari</strong>. Aktif sekarang: <strong>{savedDays} hari</strong>.
          </p>
        </div>
        <Button type="button" variant="secondary" size="sm" leftIcon={<RotateCcw className="w-3.5 h-3.5" />} onClick={resetToDefault} disabled={isLoading || isSaving || draftDays === String(DEFAULT_STORAGE_LIMIT_DAYS)}>
          Reset 365 Hari
        </Button>
      </div>

      {error && <div role="alert" className="flex items-center gap-2 p-3 text-xs text-[var(--lf-error)] bg-[var(--lf-error-soft)] rounded-[var(--lf-radius-md)]"><AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span></div>}
      {successMsg && <div role="status" className="flex items-center gap-2 p-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-[var(--lf-radius-md)]"><CheckCircle2 className="w-4 h-4 shrink-0" /><span>{successMsg}</span></div>}

      <div className="flex flex-col gap-2">
        <label htmlFor="storage-limit-input" className="text-xs font-semibold text-[var(--lf-ink)]">Batas Penyimpanan (1 – 730 Hari)</label>
        <input
          id="storage-limit-input"
          type="number"
          min={1}
          max={730}
          value={draftDays}
          disabled={isLoading || isSaving}
          onChange={(e) => { setDraftDays(e.target.value); setConfirmed(false); }}
          className="w-full h-[42px] px-3 text-sm bg-white border border-[var(--lf-border)] rounded-[10px] text-[var(--lf-ink)] focus:outline-none focus:border-[var(--lf-blue)]"
        />
        {!isValid && <p className="text-xs text-[var(--lf-error)]">Masukkan bilangan bulat antara 1 hingga 730 hari.</p>}
      </div>

      <label className="flex items-start gap-2.5 p-3 bg-amber-50/70 border border-amber-200 rounded-[var(--lf-radius-md)] text-xs text-amber-950 cursor-pointer">
        <input type="checkbox" checked={confirmed} disabled={!isDirty || isSaving} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 rounded" />
        <span>Saya paham perubahan ini <strong>non-retroaktif</strong>: hanya berlaku untuk barang baru dan tidak mengubah batas barang lama.</span>
      </label>

      <div className="flex justify-end">
        <Button type="button" variant="primary" size="sm" isLoading={isSaving} disabled={!isDirty || !confirmed || isSaving} onClick={savePolicy}>
          Simpan Kebijakan
        </Button>
      </div>
    </Card>
  );
};
