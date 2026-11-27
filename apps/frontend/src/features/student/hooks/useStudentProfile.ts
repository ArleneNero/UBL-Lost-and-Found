import { useState, useEffect } from 'react';
import { registry } from '@/services/registry';
import { UserSession } from '@/types/domain';
import { fetchAllPages } from '@/utils/pagination';

export const useStudentProfile = () => {
  const [profile, setProfile] = useState<UserSession | null>(null);
  const [stats, setStats] = useState({
    totalReports: 0,
    pendingReports: 0,
    receivedReports: 0,
    cancelledReports: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProfileData = async () => {
      setIsLoading(true);
      try {
        const user = await registry.getServices().auth.getCurrentUser();
        setProfile(user);

        const items = await fetchAllPages((page) =>
          registry.getServices().submissions.getMySubmissions({ page, limit: 100 })
        );

        setStats({
          totalReports: items.length,
          pendingReports: items.filter((s) => s.status === 'PENDING_RECEIPT').length,
          receivedReports: items.filter((s) => s.status === 'RECEIVED').length,
          cancelledReports: items.filter((s) => s.status === 'CANCELLED' || s.status === 'REJECTED').length,
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadProfileData();
  }, []);

  return { profile, stats, isLoading };
};

