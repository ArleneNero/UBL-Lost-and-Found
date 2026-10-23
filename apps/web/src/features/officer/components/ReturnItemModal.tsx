import React, { useState } from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FoundItem } from '@/types/domain';

interface ReturnItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (recipientName: string, verificationSummary: string) => Promise<void>;
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
  const [verificationSummary, setVerificationSummary] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);

  if (!isOpen) return null;

  const canSubmit = recipientName.trim().length > 0 && verificationSummary.trim().length > 0 && isConfirmed && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    await onConfirm(recipientName.trim(), verificationSummary.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-[var(--lf-canvas)] rounded-[var(--lf-radius-xl)] border border-[var(--lf-border)] shadow-xl p-6">
        <button onClick={onClose} className="absolute right-4 top-4 p-1.5 rounded-full text-[var(--lf-muted)] hover:bg-[var(--lf-surface)] cursor-pointer">
          <X className="w-4 h-4" />
        </button>
        <h3 className="text-base font-semibold text-[var(--lf-ink)]">Proses Pengembalian Barang</h3>
        <p className="text-xs text-[var(--lf-muted)] mt-1">Verifikasi kepemilikan dan serahkan barang fisik kepada pemilik sah.</p>
        <div className="my-3 p-3 bg-[var(--lf-surface)] rounded-[var(--lf-radius-md)] text-xs border border-[var(--lf-border)]">
          <p className="font-bold text-[var(--lf-ink)]">{item.name}</p>
          <p className="text-[var(--lf-muted)] font-mono">{item.inventoryCode} · {item.postName}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--lf-ink)] mb-1">Nama Lengkap Penerima *</label>
            <input type="text" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Nama lengkap penerima..." className="w-full px-3 py-2 text-xs bg-[var(--lf-canvas)] border border-[var(--lf-border)] rounded-[var(--lf-radius-md)] text-[var(--lf-ink)] focus:outline-none focus:border-[var(--lf-action)]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--lf-ink)] mb-1">Ringkasan Verifikasi Kepemilikan *</label>
            <textarea value={verificationSummary} onChange={(e) => setVerificationSummary(e.target.value)} rows={2} placeholder="Ciri khusus yang dicocokkan (isi dompet, wallpaper, ciri fisik)..." className="w-full p-2.5 text-xs bg-[var(--lf-canvas)] border border-[var(--lf-border)] rounded-[var(--lf-radius-md)] text-[var(--lf-ink)] focus:outline-none focus:border-[var(--lf-action)] resize-none" />
          </div>
          <div className="flex items-start gap-2 p-2.5 bg-[var(--lf-soft)] rounded-[var(--lf-radius-sm)] text-[11px] text-[var(--lf-action)]">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Pemberitahuan Privasi: Jangan meminta atau menyimpan salinan foto KTP/NIK/KTM. Cukup lakukan verifikasi langsung.</span>
          </div>
          <label className="flex items-start gap-2 text-xs text-[var(--lf-ink)] cursor-pointer">
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
