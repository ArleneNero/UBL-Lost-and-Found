import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchX, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { RoutePaths } from '@/constants/routes';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-[var(--lf-soft)] text-[var(--lf-action)] flex items-center justify-center mb-5">
        <SearchX className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold text-[var(--lf-ink)] mb-2">Halaman Tidak Ditemukan</h1>
      <p className="text-sm text-[var(--lf-muted)] max-w-md mb-6 leading-relaxed">
        Halaman yang Anda tuju tidak tersedia atau barang yang dicari sudah tidak aktif dalam sistem katalog.
      </p>
      <Button
        variant="primary"
        leftIcon={<ArrowLeft className="w-4 h-4" />}
        onClick={() => navigate(RoutePaths.LANDING)}
      >
        Kembali ke Beranda
      </Button>
    </div>
  );
};
