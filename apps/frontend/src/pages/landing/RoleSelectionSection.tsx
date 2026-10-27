import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { RoutePaths } from '@/constants/routes';
import { RoleCard } from './RoleCard';

export const RoleSelectionSection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-base sm:text-lg font-bold text-[var(--lf-ink)]">
          Masuk ke UBL LostnFound
        </h2>
        <p className="text-xs sm:text-sm text-[var(--lf-muted)]">
          Pilih akses yang sesuai dengan kebutuhanmu.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Mahasiswa (Segera Hadir) */}
        <RoleCard
          title="Mahasiswa"
          description="Portal pelaporan online mahasiswa segera hadir"
          iconSrc="/assets/illustrations/roles/Icon_Mahasiswa.png"
          badge="Segera Hadir"
          disabled={true}
        />

        {/* Card 2: Petugas */}
        <RoleCard
          title="Petugas"
          description="Login untuk mengelola barang dan penyerahan"
          iconSrc="/assets/illustrations/roles/Icon_Petugas.png"
          onClick={() => navigate(RoutePaths.OFFICER_LOGIN)}
        />

        {/* Card 3: Mode Tamu */}
        <RoleCard
          title="Mode Tamu"
          description="Lihat barang dan lokasi pos tanpa login"
          iconFallback={<Search className="w-5 h-5 text-[var(--lf-action)]" />}
          iconBgColor="bg-[#EFF8FF]"
          onClick={() => navigate(RoutePaths.GUEST_HOME)}
        />
      </div>

      <p className="text-xs text-[var(--lf-muted)] pt-1">
        Katalog dapat diakses tanpa membuat akun.
      </p>
    </section>
  );
};
