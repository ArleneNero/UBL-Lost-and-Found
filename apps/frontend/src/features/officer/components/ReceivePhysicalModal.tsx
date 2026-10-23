import React, { useState } from 'react';
import { CheckSquare } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export interface ReceivePhysicalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (notes: string) => Promise<void>;
  isSubmitting: boolean;
  itemName: string;
  reportCode: string;
}

export const ReceivePhysicalModal: React.FC<ReceivePhysicalModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  itemName,
  reportCode,
}) => {
  const [confirmed, setConfirmed] = useState(false);
  const [notes, setNotes] = useState('');

  const handleConfirm = async () => {
    if (!confirmed) return;
    await onConfirm(notes);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Konfirmasi Terima Fisik">
      <div className="flex flex-col gap-4 text-xs">
        <p className="text-[var(--lf-muted)]">
          Pastikan mahasiswa sudah menyerahkan barang fisik sebelum konfirmasi. Barang akan otomatis tercatat ke inventaris pos.
        </p>
        <div className="p-3 bg-[var(--lf-surface)] border border-[var(--lf-border)] rounded-[var(--lf-radius-md)]">
          <span className="font-bold text-[var(--lf-ink)]">{itemName}</span>
          <span className="text-[var(--lf-muted)] block font-mono">Kode Laporan: {reportCode}</span>
        </div>
        <textarea
          rows={2}
          placeholder="Catatan verifikasi internal (opsional, hanya untuk petugas)..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-3 py-2 bg-[var(--lf-canvas)] border border-[var(--lf-border)] rounded-[var(--lf-radius-md)] text-[var(--lf-ink)]"
        />
        <div className="flex items-start gap-2 pt-2 border-t border-[var(--lf-border)]">
          <input
            type="checkbox"
            id="receiveCheck"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-[var(--lf-border)] text-[var(--lf-action)]"
          />
          <label htmlFor="receiveCheck" className="cursor-pointer font-semibold text-[var(--lf-ink)] select-none">
            Saya memastikan barang fisik sudah diterima dan sesuai dengan laporan.
          </label>
        </div>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>Batal</Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!confirmed}
            isLoading={isSubmitting}
            leftIcon={<CheckSquare className="w-4 h-4" />}
            onClick={handleConfirm}
          >
            Konfirmasi Penerimaan
          </Button>
        </div>
      </div>
    </Modal>
  );
};
