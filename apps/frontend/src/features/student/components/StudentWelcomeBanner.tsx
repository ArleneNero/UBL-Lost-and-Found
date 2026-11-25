import React from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Search } from 'lucide-react';
import { RoutePaths } from '@/constants/routes';

interface StudentWelcomeBannerProps {
  name?: string;
  studentNumber?: string | null;
}

export const StudentWelcomeBanner: React.FC<StudentWelcomeBannerProps> = ({
  name,
  studentNumber,
}) => {
  return (
    <div className="bg-gradient-to-r from-[#0B5ED7] to-[#1677FF] rounded-3xl p-6 sm:p-8 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div className="space-y-2 max-w-xl">
        <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-semibold backdrop-blur-xs">
          Portal Mahasiswa UBL
        </span>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">
          Halo, {name || 'Mahasiswa Budi Luhur'}!
        </h1>
        <p className="text-xs sm:text-sm text-blue-100">
          NIM: <span className="font-semibold">{studentNumber || '-'}</span> • Terima kasih telah berpartisipasi menjaga kejujuran dan kepedulian di lingkungan kampus.
        </p>
      </div>

      <div className="flex flex-wrap sm:flex-nowrap gap-3 shrink-0">
        <Link
          to={RoutePaths.STUDENT_REPORT_FOUND}
          className="flex-1 sm:flex-none px-4 py-2.5 bg-white text-[var(--lf-action)] hover:bg-blue-50 font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Lapor Temuan</span>
        </Link>
        <Link
          to={RoutePaths.CATALOG}
          className="flex-1 sm:flex-none px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 border border-white/20 backdrop-blur-xs transition-all"
        >
          <Search className="w-4 h-4" />
          <span>Cari Barang</span>
        </Link>
      </div>
    </div>
  );
};

