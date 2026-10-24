import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { RoutePaths } from '@/constants/routes';

const STEPS = [
  {
    step: '1. Cari barang',
    desc: 'Telusuri barang yang sudah diterima petugas.',
  },
  {
    step: '2. Periksa pos penyimpanan',
    desc: 'Lihat pos yang benar-benar menyimpan barang.',
  },
  {
    step: '3. Datang ke pos',
    desc: 'Periksa lokasi dan jam layanan terlebih dahulu.',
  },
  {
    step: '4. Verifikasi kepemilikan',
    desc: 'Jelaskan ciri atau tunjukkan bukti kepada petugas.',
  },
  {
    step: '5. Barang diserahkan',
    desc: 'Petugas mencatat penyerahan setelah bukti dinilai memadai.',
  },
];

export const GuidePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-12 py-8 flex flex-col gap-8">
      {/* Header (Figma 03.P05) */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--lf-ink)]">
          Alur Pengambilan
        </h1>
        <p className="text-xs sm:text-sm text-[var(--lf-muted)] mt-1">
          Tidak perlu mengajukan klaim online.
        </p>
      </div>

      {/* 5 Steps Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {STEPS.map((item, index) => (
          <div
            key={item.step}
            className="p-5 bg-white rounded-2xl border border-[var(--lf-border)] flex flex-col justify-between gap-3 hover:border-[var(--lf-action)] hover:shadow-xs transition-all duration-150"
          >
            <div>
              <div className="w-8 h-8 rounded-full bg-[var(--lf-soft)] text-[var(--lf-action)] font-bold text-xs flex items-center justify-center mb-3">
                {index + 1}
              </div>
              <h2 className="text-sm font-bold text-[var(--lf-ink)]">
                {item.step}
              </h2>
              <p className="text-xs text-[var(--lf-muted)] mt-1 leading-relaxed">
                {item.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Button */}
      <div className="flex justify-start pt-2">
        <Button
          variant="primary"
          size="md"
          leftIcon={<Search className="w-4 h-4" />}
          onClick={() => navigate(RoutePaths.CATALOG)}
          className="rounded-xl px-6 text-xs font-semibold"
        >
          Cari Barang
        </Button>
      </div>
    </div>
  );
};

