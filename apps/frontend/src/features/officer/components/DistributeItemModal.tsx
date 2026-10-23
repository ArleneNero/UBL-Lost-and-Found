import React, { useState } from 'react';
import { X, SendHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FoundItem } from '@/types/domain';

interface DistributeItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (notes: string) => Promise<void>;
  item: FoundItem;
  isSubmitting: boolean;
}

export const DistributeItemModal: React.FC<DistributeItemModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  item,
  isSubmitting,
}) => {
  const [notes, setNotes] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);

  if (!isOpen) return null;

  const canSubmit = notes.trim().length > 0 && isConfirmed && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    await onConfirm(notes.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-[var(--lf-canvas)] rounded-[var(--lf-radius-xl)] border border-[var(--lf-border)] shadow-xl p-6">
        <button onClick={onClose} className="absolute right-4 top-4 p-1.5 rounded-full text-[var(--lf-muted)] hover:bg-[var(--lf-surface)] cursor-pointer">
          <X className="w-4 h-4" />
        </button>
        <h3 className="text-base font-semibold text-[var(--lf-ink)]">Penyaluran Barang Temuan</h3>
        <p className="text-xs text-[var(--lf-muted)] mt-1">Penyaluran barang temuan yang tidak terambil ke pihak ketiga atau sosial.</p>
        <div className="my-3 p-3 bg-[var(--lf-surface)] rounded-[var(--lf-radius-md)] text-xs border border-[var(--lf-border)]">
          <p className="font-bold text-[var(--lf-ink)]">{item.name}</p>
          <p className="text-[var(--lf-muted)] font-mono">{item.inventoryCode} · {item.postName}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--lf-ink)] mb-1">Tujuan / Catatan Penyaluran *</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Tuliskan pihak penerima penyaluran (misal: DKM Masjid Budi Luhur, panti asuhan)..." className="w-full p-2.5 text-xs bg-[var(--lf-canvas)] border border-[var(--lf-border)] rounded-[var(--lf-radius-md)] text-[var(--lf-ink)] focus:outline-none focus:border-[var(--lf-action)] resize-none" />
          </div>
          <div className="flex items-start gap-2 p-2.5 bg-[var(--lf-surface)] border border-[var(--lf-border)] rounded-[var(--lf-radius-sm)] text-[11px] text-[var(--lf-muted)]">
            <SendHorizontal className="w-4 h-4 shrink-0 text-[var(--lf-action)] mt-0.5" />
            <span>Barang akan ditandai Disalurkan dan otomatis disembunyikan dari katalog publik. Aksi ini tidak dapat dibatalkan.</span>
          </div>
          <label className="flex items-start gap-2 text-xs text-[var(--lf-ink)] cursor-pointer">
            <input id="distributeCheck" type="checkbox" checked={isConfirmed} onChange={(e) => setIsConfirmed(e.target.checked)} className="mt-0.5 rounded border-[var(--lf-border)]" />
            <span>Saya mengonfirmasi bahwa barang ini dialihkan/disalurkan sesuai ketentuan operasional kampus.</span>
          </label>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--lf-border)]">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>Batal</Button>
            <Button type="submit" variant="primary" size="sm" disabled={!canSubmit} isLoading={isSubmitting}>Konfirmasi Penyaluran</Button>
          </div>
        </form>
      </div>
    </div>
  );
};
