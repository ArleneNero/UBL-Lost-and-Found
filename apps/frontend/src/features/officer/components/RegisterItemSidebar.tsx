import React from 'react';
import { Building2, HelpCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export const RegisterItemSidebar: React.FC = () => {
  return (
    <div className="flex flex-col gap-4">
      <Card className="p-5 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--lf-ink)]">
          <Building2 className="w-4 h-4 text-[var(--lf-action)]" /> Pos: Pengajaran
        </div>
        <p className="text-xs text-[var(--lf-muted)]">Unit ditetapkan dari akun petugas yang sedang masuk.</p>
      </Card>
      <Card className="p-5 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--lf-ink)]">
          <HelpCircle className="w-4 h-4 text-[var(--lf-action)]" /> Barang sudah diterima?
        </div>
        <p className="text-xs text-[var(--lf-muted)]">
          Terima barang seperti biasa, lalu catat di form. Mahasiswa tidak wajib membuat laporan online terlebih dahulu.
        </p>
      </Card>
    </div>
  );
};
