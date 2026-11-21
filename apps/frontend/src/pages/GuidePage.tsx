import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, MapPin, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { RoutePaths } from '@/constants/routes';
import { ACTIVE_SERVICE_POST } from '@/constants/locations';

const STEPS = [
  {
    step: 'Cari barang',
    desc: 'Telusuri barang yang sudah diterima petugas.',
  },
  {
    step: 'Periksa pos penyimpanan',
    desc: 'Lihat pos yang benar-benar menyimpan barang.',
  },
  {
    step: 'Datang ke pos',
    desc: 'Periksa lokasi dan jam layanan terlebih dahulu.',
  },
  {
    step: 'Verifikasi kepemilikan',
    desc: 'Jelaskan ciri atau tunjukkan bukti kepada petugas.',
  },
  {
    step: 'Barang diserahkan',
    desc: 'Petugas mencatat penyerahan setelah bukti dinilai memadai.',
  },
];

export const GuidePage: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    const idx = window.history.state?.idx;
    if (typeof idx === 'number' && idx > 0) {
      navigate(-1);
    } else {
      navigate(RoutePaths.GUEST_HOME);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-12 py-8 flex flex-col gap-8">
      {/* Back & Header (Figma 03.P05) */}
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1570EF] hover:underline w-fit cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali</span>
        </button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--lf-ink)]">
            Alur Pengambilan
          </h1>
          <p className="text-xs sm:text-sm text-[var(--lf-muted)] mt-1">
            Tidak perlu mengajukan klaim online.
          </p>
        </div>
      </div>

      {/* 3x2 Symmetrical Grid: 5 Steps + 1 Service Post Info Card */}
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

        <div className="p-5 bg-blue-50/70 border border-blue-200 rounded-2xl flex flex-col justify-between gap-3">
          <div>
            <div className="w-8 h-8 rounded-full bg-blue-100 text-[#1570EF] flex items-center justify-center mb-3">
              <MapPin className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-[var(--lf-ink)]">
              Info Lokasi & Syarat Pengambilan
            </h2>
            <p className="text-xs text-[#475467] mt-1 leading-relaxed">
              Siapkan KTM/KTP & kunjungi {ACTIVE_SERVICE_POST.location} ({ACTIVE_SERVICE_POST.openingHours}).
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(`${RoutePaths.POSTS}?from=guide`)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#1570EF] hover:underline w-fit cursor-pointer mt-1"
          >
            <span>Lihat Pos Pelayanan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
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

