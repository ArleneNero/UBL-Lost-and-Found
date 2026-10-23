import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Construction, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { RoutePaths } from '@/constants/routes';

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  description = 'Halaman ini berada di luar cakupan tahap ini dan belum diaktifkan.',
}) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-5">
        <Construction className="w-8 h-8" />
      </div>
      <h1 className="text-xl font-bold text-[var(--lf-ink)] mb-2">{title}</h1>
      <p className="text-sm text-[var(--lf-muted)] max-w-md mb-6 leading-relaxed">
        {description}
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
