import React, { useState } from 'react';
import { Lock, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FoundItem } from '@/types/domain';

interface ReturnItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    recipientName: string,
    verificationSummary: string,
    recipientIdentifier?: string
  ) => Promise<void>;
  item: FoundItem;
  isSubmitting: boolean;
}

export const ReturnItemModal: React.FC<ReturnItemModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  item,
  isSubmitting,
}) => {
  const [recipientName, setRecipientName] = useState('');
  const [recipientIdentifier, setRecipientIdentifier] = useState('');
  const [verificationSummary, setVerificationSummary] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);

  if (!isOpen) return null;

  const canSubmit = recipientName.trim().length > 0 && verificationSummary.trim().length > 0 && isConfirmed && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    await onConfirm(
      recipientName.trim(),
      verificationSummary.trim(),
      recipientIdentifier.trim() || undefined
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="relative w-full max-w-lg max-h-[90dvh] overflow-y-auto bg-[var(--lf-canvas)] rounded-[var(--lf-radius-xl)] border border-[var(--lf-border)] shadow-xl p-5 sm:p-6">
        <button onClick={onClose} aria-label="Tutup modal" className="absolute right-3.5 top-3.5 p-2 rounded-full text-[var(--lf-muted)] hover:bg-[var(--lf-surface)] cursor-pointer">
          <X className="w-4 h-4" />
        </button>
        <h3 className="text-base font-semibold text-[var(--lf-ink)]">Serah Terima ke Pemilik</h3>
        <p className="text-xs text-[var(--lf-muted)] mt-1">Verifikasi kepemilikan dan serahkan barang fisik kepada pemilik sah.</p>
        <div className="my-3 p-3 bg-[var(--lf-surface)] rounded-[var(--lf-radius-md)] text-xs border border-[var(--lf-border)] space-y-2">
          <div>
            <p className="font-bold text-[var(--lf-ink)]">{item.name}</p>
            <p className="text-[var(--lf-muted)] font-mono">{item.inventoryCode} · {item.postName}</p>
          </div>
          <div className="pt-2 border-t border-[var(--lf-border)] flex items-start gap-1.5 text-[11px]">
            <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <span className="text-[var(--lf-ink)] leading-relaxed">
              <strong className="font-semibold">Ciri internal:</strong>{' '}
              {item.privateNotes ? (
                item.privateNotes
              ) : (
                <span className="text-[var(--lf-muted)] italic">Tidak ada catatan ciri internal.</span>
              )}
            </span>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label htmlFor="recipientNameInput" className="block text-xs font-semibold text-[var(--lf-ink)] mb-1">Nama Lengkap Penerima *</label>
            <input id="recipientNameInput" type="text" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Nama lengkap penerima..." className="w-full px-3 py-2 text-base sm:text-xs bg-[var(--lf-canvas)] border border-[var(--lf-border)] rounded-[var(--lf-radius-md)] text-[var(--lf-ink)] focus:outline-none focus:border-[var(--lf-action)]" />
          </div>
          <div>
            <label htmlFor="recipientIdentifierInput" className="block text-xs font-semibold text-[var(--lf-ink)] mb-1">NIM / ID Kampus (Opsional)</label>
            <input id="recipientIdentifierInput" type="text" maxLength={50} value={recipientIdentifier} onChange={(e) => setRecipientIdentifier(e.target.value)} placeholder="Contoh: 2111500123 atau NIP/Unit (kosongkan jika tamu)" className="w-full px-3 py-2 text-base sm:text-xs bg-[var(--lf-canvas)] border border-[var(--lf-border)] rounded-[var(--lf-radius-md)] text-[var(--lf-ink)] focus:outline-none focus:border-[var(--lf-action)]" />
          </div>
          <div>
            <label htmlFor="verificationSummaryInput" className="block text-xs font-semibold text-[var(--lf-ink)] mb-1">Ringkasan Verifikasi Kepemilikan *</label>
            <textarea id="verificationSummaryInput" value={verificationSummary} onChange={(e) => setVerificationSummary(e.target.value)} rows={2} placeholder="Ciri khusus yang dicocokkan (isi dompet, wallpaper, ciri fisik)..." className="w-full p-2.5 text-base sm:text-xs bg-[var(--lf-canvas)] border border-[var(--lf-border)] rounded-[var(--lf-radius-md)] text-[var(--lf-ink)] focus:outline-none focus:border-[var(--lf-action)] resize-none" />
          </div>
          <label className="flex items-start gap-2 text-xs text-[var(--lf-ink)] cursor-pointer pt-1">
            <input id="verifyCheck" type="checkbox" checked={isConfirmed} onChange={(e) => setIsConfirmed(e.target.checked)} className="mt-0.5 rounded border-[var(--lf-border)]" />
            <span>Saya memastikan identitas penerima dan kepemilikan telah diverifikasi langsung di pos layanan.</span>
          </label>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--lf-border)]">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>Batal</Button>
            <Button type="submit" variant="primary" size="sm" disabled={!canSubmit} isLoading={isSubmitting}>Konfirmasi Serah Terima</Button>
          </div>
        </form>
      </div>
    </div>
  );
};
