import React from 'react';
import { Hash, Mail, ShieldCheck, LogOut } from 'lucide-react';
import { UserSession } from '@/types/domain';

interface StudentIdentityCardProps {
  profile: UserSession | null;
  onLogout: () => void;
}

export const StudentIdentityCard: React.FC<StudentIdentityCardProps> = ({
  profile,
  onLogout,
}) => {
  return (
    <div className="bg-white rounded-3xl border border-[var(--lf-border)] p-6 sm:p-8 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-[var(--lf-border)]">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h2 className="text-lg font-bold text-[var(--lf-ink)]">
              {profile?.name || '-'}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Mahasiswa Aktif
            </span>
          </div>
          <p className="text-xs text-[var(--lf-muted)]">
            Universitas Budi Luhur
          </p>
        </div>

        <button
          onClick={onLogout}
          className="w-full sm:w-auto justify-center px-4 py-2.5 sm:py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Keluar dari Akun</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 text-xs">
        <div className="p-4 bg-[var(--lf-canvas)] rounded-2xl border border-[var(--lf-border)] flex items-center gap-3 min-w-0">
          <Hash className="w-5 h-5 text-[var(--lf-muted)] shrink-0" />
          <div className="min-w-0">
            <span className="text-[var(--lf-muted)] block">Nomor Induk Mahasiswa (NIM)</span>
            <span className="font-bold text-[var(--lf-ink)] text-sm block truncate">
              {profile?.studentNumber || '-'}
            </span>
          </div>
        </div>

        <div className="p-4 bg-[var(--lf-canvas)] rounded-2xl border border-[var(--lf-border)] flex items-center gap-3 min-w-0">
          <Mail className="w-5 h-5 text-[var(--lf-muted)] shrink-0" />
          <div className="min-w-0">
            <span className="text-[var(--lf-muted)] block">Email Kampus</span>
            <span className="font-bold text-[var(--lf-ink)] text-sm block break-all">
              {profile?.email || '-'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

