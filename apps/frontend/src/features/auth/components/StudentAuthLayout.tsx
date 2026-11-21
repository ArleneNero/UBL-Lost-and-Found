import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, GraduationCap, User } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { RoutePaths } from '@/constants/routes';
import { setGuestModeActive } from '@/utils/guestSession';

interface StudentAuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  activeTab?: 'login' | 'register';
  footerAction?: React.ReactNode;
}

export const StudentAuthLayout: React.FC<StudentAuthLayoutProps> = ({
  title,
  subtitle,
  children,
  activeTab,
  footerAction,
}) => {
  return (
    <div className="py-8 sm:py-12 px-4 flex items-center justify-center">
      <div className="w-full max-w-md flex flex-col gap-6">
        {/* Back Link */}
        <div>
          <Link
            to={`${RoutePaths.LANDING}?switch=true`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#475467] hover:text-[#1570EF] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Pilih peran</span>
          </Link>
        </div>

        {/* Header Card Info - Matching Officer Form style */}
        <div className="text-center flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-[#EFF8FF] border border-[#B2DDFF] flex items-center justify-center text-[#1570EF] shadow-xs mb-3.5">
            <GraduationCap className="w-7 h-7 text-[#1570EF]" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFF8FF] border border-[#D1E9FF] text-[#175CD3] text-xs font-semibold mb-2">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Portal Khusus Mahasiswa</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--lf-ink)] tracking-tight">
            {title}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--lf-muted)] mt-1.5 max-w-xs">
            {subtitle}
          </p>
        </div>

        {/* Form Card */}
        <Card className="p-6 sm:p-8 shadow-sm border border-[var(--lf-border)] bg-white rounded-2xl">
          {/* Segmented Switcher: [ Login ] [ Register ] */}
          {activeTab && (
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#F2F4F7] rounded-xl border border-[#E4E7EC] mb-5">
              <Link
                to={RoutePaths.LOGIN}
                className={`flex items-center justify-center py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'login'
                    ? 'bg-gradient-to-b from-[#3194FF] to-[#0873F8] text-white shadow-sm'
                    : 'text-[#0B5ED7] hover:text-[#094bb0]'
                }`}
              >
                Login
              </Link>

              <Link
                to={RoutePaths.REGISTER}
                className={`flex items-center justify-center py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'register'
                    ? 'bg-gradient-to-b from-[#3194FF] to-[#0873F8] text-white shadow-sm'
                    : 'text-[#0B5ED7] hover:text-[#094bb0]'
                }`}
              >
                Register
              </Link>
            </div>
          )}

          {children}
        </Card>

        {/* Secondary Footer Switch Link */}
        {footerAction && (
          <div className="text-center text-xs text-[var(--lf-muted)] px-4">
            {footerAction}
          </div>
        )}

        {/* Guest Portal Entry Card */}
        <Link
          to={RoutePaths.GUEST_HOME}
          onClick={() => setGuestModeActive(true)}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-[#EAF3FF] hover:bg-[#d8e9ff] active:scale-[0.99] text-[#0B5ED7] rounded-xl text-xs sm:text-sm font-semibold transition-all border border-[#D1E9FF]"
        >
          <User className="w-4 h-4 text-[#0B5ED7] shrink-0" />
          <span>Masuk sebagai Tamu (Lihat Barang)</span>
        </Link>
      </div>
    </div>
  );
};
