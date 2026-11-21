import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RoutePaths } from '@/constants/routes';
import { registry } from '@/services/registry';
import { useStudentProfile } from '@/features/student/hooks/useStudentProfile';
import { StudentIdentityCard } from '@/features/student/components/StudentIdentityCard';
import { StudentActivityCard } from '@/features/student/components/StudentActivityCard';

export const StudentProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, stats, isLoading } = useStudentProfile();

  const handleLogout = async () => {
    await registry.getServices().auth.logout();
    navigate(RoutePaths.LANDING);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--lf-ink)]">
          Profil Mahasiswa
        </h1>
        <p className="text-xs sm:text-sm text-[var(--lf-muted)] mt-1">
          Informasi identitas akun dan ringkasan aktivitas di UBL LostnFound.
        </p>
      </div>

      <StudentIdentityCard profile={profile} onLogout={handleLogout} />

      <StudentActivityCard
        totalReports={stats.totalReports}
        pendingReports={stats.pendingReports}
        receivedReports={stats.receivedReports}
        isLoading={isLoading}
      />
    </div>
  );
};
