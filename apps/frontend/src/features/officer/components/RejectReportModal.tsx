import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export interface RejectReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  isSubmitting: boolean;
  itemName: string;
  reportCode: string;
}

export const RejectReportModal: React.FC<RejectReportModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  itemName,
  reportCode,
}) => {
  const [reason, setReason] = useState('');

  const handleConfirm = async () => {
    if (!reason.trim()) return;
    await onConfirm(reason.trim());
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tolak Laporan">
      <div className="flex flex-col gap-4 text-xs">
        <p className="text-[var(--lf-muted)]">
          Petugas wajib mengisi alasan penolakan secara jelas. Mahasiswa akan menerima pemberitahuan dan status berubah menjadi Ditolak.
        </p>
        <div className="p-3 bg-[var(--lf-surface)] border border-[var(--lf-border)] rounded-[var(--lf-radius-md)]">
          <span className="font-bold text-[var(--lf-ink)]">{itemName}</span>
          <span className="text-[var(--lf-muted)] block font-mono">Kode Laporan: {reportCode}</span>
        </div>
        <div>
          <label className="font-bold text-[var(--lf-ink)] block mb-1">Alasan penolakan *</label>
          <textarea
            rows={3}
            placeholder="Tulis alasan mengapa laporan ditolak (misal: barang tidak diserahkan, informasi fiktif)..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--lf-canvas)] border border-[var(--lf-border)] rounded-[var(--lf-radius-md)] text-[var(--lf-ink)] focus:outline-none focus:border-[var(--lf-error)]"
          />
          <span className="text-[11px] text-[var(--lf-muted)] mt-1 block">Alasan wajib diisi. Perubahan tercatat pada riwayat status.</span>
        </div>
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--lf-border)]">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>Batal</Button>
          <Button
            variant="danger"
            size="sm"
            disabled={!reason.trim()}
            isLoading={isSubmitting}
            leftIcon={<AlertTriangle className="w-4 h-4" />}
            onClick={handleConfirm}
          >
            Konfirmasi Penolakan
          </Button>
        </div>
      </div>
    </Modal>
  );
};
