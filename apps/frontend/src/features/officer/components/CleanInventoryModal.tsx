import React, { useState, useId, useMemo, useEffect } from 'react';
import { Archive, Printer, X, AlertCircle, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';
import { FoundItem } from '@/types/domain';
import { Button } from '@/components/ui/Button';
import { toLocalDateKey } from '../selectors/reportDateSelectors';

export interface CleanInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  completedItems: FoundItem[];
  onConfirmClean: (month?: string) => Promise<number>;
  onOpenReport?: () => void;
}

export const CleanInventoryModal: React.FC<CleanInventoryModalProps> = ({
  isOpen,
  onClose,
  completedItems,
  onConfirmClean,
  onOpenReport,
}) => {
  const titleId = useId();
  const [scope, setScope] = useState<'all' | 'month'>('all');
  const [month, setMonth] = useState(() => toLocalDateKey(new Date().toISOString()).slice(0, 7));
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eligibleCount = useMemo(() => {
    if (scope === 'all') return completedItems.length;
    return completedItems.filter(
      (item) => toLocalDateKey(item.receivedAt).slice(0, 7) === month
    ).length;
  }, [completedItems, scope, month]);

  useEffect(() => {
    if (eligibleCount === 0 && confirmed) {
      setConfirmed(false);
    }
  }, [eligibleCount, confirmed]);

  if (!isOpen) return null;

  const handleClose = () => {
    setConfirmed(false);
    setError(null);
    onClose();
  };

  const handleClean = async () => {
    if (!confirmed || eligibleCount === 0 || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirmClean(scope === 'month' ? month : undefined);
      setConfirmed(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membersihkan arsip inventaris.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
      <div className="fixed inset-0 bg-black/45 backdrop-blur-xs" onClick={handleClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="relative z-10 w-full max-w-md bg-white rounded-[20px] shadow-xl border border-[var(--lf-border)] p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 id={titleId} className="text-base font-bold text-[var(--lf-ink)] flex items-center gap-2">
            <Archive className="w-5 h-5 text-[var(--lf-action)]" /> Bersihkan Arsip Inventaris
          </h3>
          <button type="button" onClick={handleClose} aria-label="Tutup modal" className="p-1 rounded-full text-[var(--lf-muted)] hover:bg-[#F2F4F7] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[var(--lf-muted)] leading-relaxed">
          Menyembunyikan item selesai (<strong>Sudah Diserahkan</strong> &amp; <strong>Disalurkan</strong>) dari daftar utama tanpa menghapus jejak audit atau barang <strong>Tersedia (STORED)</strong>. Terdeteksi <strong>{eligibleCount}</strong> barang selesai aktif siap diarsipkan.
        </p>

        {error && <div role="alert" className="flex items-center gap-2 p-3 text-xs text-[var(--lf-error)] bg-[var(--lf-error-soft)] rounded-[var(--lf-radius-md)]"><AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span></div>}

        <div className="space-y-2 text-xs">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="clean-scope" checked={scope === 'all'} onChange={() => setScope('all')} />
            <span>Semua item selesai</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="clean-scope" checked={scope === 'month'} onChange={() => setScope('month')} />
            <span>Bulan penerimaan tertentu</span>
          </label>
          {scope === 'month' && (
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Pilih bulan arsip" className="w-full h-[40px] px-3 border border-[var(--lf-border)] rounded-[10px] text-sm" />
          )}
        </div>

        {eligibleCount === 0 && (
          <div role="status" className="flex items-start gap-2 p-3 text-xs text-amber-900 bg-amber-50 border border-amber-300 rounded-[var(--lf-radius-md)]">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              {scope === 'month'
                ? `Tidak ada barang selesai pada bulan ${month} yang dapat diarsipkan. Barang berstatus STORED tetap aman di inventaris aktif.`
                : 'Belum ada barang selesai (Sudah Diserahkan atau Disalurkan) yang siap diarsipkan. Barang berstatus STORED tetap aman di inventaris aktif.'}
            </span>
          </div>
        )}

        {onOpenReport && (
          <Button type="button" variant="secondary" size="sm" leftIcon={<Printer className="w-4 h-4" />} onClick={() => { handleClose(); onOpenReport(); }}>
            Cetak Rekap Dulu
          </Button>
        )}

        <label
          className={clsx(
            'flex items-start gap-2.5 p-3 border rounded-[var(--lf-radius-md)] text-xs',
            eligibleCount === 0
              ? 'bg-gray-50 border-gray-200 text-[var(--lf-muted)] cursor-not-allowed opacity-70'
              : 'bg-amber-50/70 border-amber-200 text-amber-950 cursor-pointer'
          )}
        >
          <input
            type="checkbox"
            checked={eligibleCount > 0 && confirmed}
            disabled={eligibleCount === 0 || isSubmitting}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 rounded"
          />
          <span>Saya paham barang berstatus STORED tetap aman dan data arsip masih bisa dilihat lewat filter <strong>Hanya Arsip</strong>.</span>
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" size="sm" onClick={handleClose} disabled={isSubmitting}>Batal</Button>
          <Button type="button" variant="primary" size="sm" isLoading={isSubmitting} disabled={!confirmed || eligibleCount === 0 || isSubmitting} onClick={handleClean}>
            Bersihkan (Arsipkan)
          </Button>
        </div>
      </div>
    </div>
  );
};
