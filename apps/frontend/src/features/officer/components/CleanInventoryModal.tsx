import React, { useState, useId } from 'react';
import { Archive, Printer, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface CleanInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  completedCount: number;
  onConfirmClean: (month?: string) => Promise<number>;
  onOpenReport?: () => void;
}

export const CleanInventoryModal: React.FC<CleanInventoryModalProps> = ({
  isOpen,
  onClose,
  completedCount,
  onConfirmClean,
  onOpenReport,
}) => {
  const titleId = useId();
  const [scope, setScope] = useState<'all' | 'month'>('all');
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setConfirmed(false);
    setError(null);
    onClose();
  };

  const handleClean = async () => {
    if (!confirmed || isSubmitting) return;
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
          Menyembunyikan item selesai (<strong>Sudah Diserahkan</strong> &amp; <strong>Disalurkan</strong>) dari daftar utama tanpa menghapus jejak audit atau barang <strong>Tersedia (STORED)</strong>. Terdeteksi <strong>{completedCount}</strong> barang selesai aktif.
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

        {onOpenReport && (
          <Button type="button" variant="secondary" size="sm" leftIcon={<Printer className="w-4 h-4" />} onClick={() => { handleClose(); onOpenReport(); }}>
            Cetak Rekap Dulu
          </Button>
        )}

        <label className="flex items-start gap-2.5 p-3 bg-amber-50/70 border border-amber-200 rounded-[var(--lf-radius-md)] text-xs text-amber-950 cursor-pointer">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 rounded" />
          <span>Saya paham barang berstatus STORED tetap aman dan data arsip masih bisa dilihat lewat filter <strong>Tampilkan Arsip</strong>.</span>
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" size="sm" onClick={handleClose} disabled={isSubmitting}>Batal</Button>
          <Button type="button" variant="primary" size="sm" isLoading={isSubmitting} disabled={!confirmed || isSubmitting} onClick={handleClean}>
            Bersihkan (Arsipkan)
          </Button>
        </div>
      </div>
    </div>
  );
};
