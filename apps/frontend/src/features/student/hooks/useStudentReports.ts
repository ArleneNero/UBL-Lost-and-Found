import { useState, useEffect, useCallback } from 'react';
import { registry } from '@/services/registry';
import { Submission } from '@/types/domain';
import { ReportStatus } from '@/types/api';

export type StudentFilterStatus = 'ALL' | ReportStatus;

export const useStudentReports = (initialStatus: StudentFilterStatus = 'ALL') => {
  const [reports, setReports] = useState<Submission[]>([]);
  const [statusFilter, setStatusFilter] = useState<StudentFilterStatus>(initialStatus);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const submissionService = registry.getServices().submissions;
      const res = await submissionService.getMySubmissions({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        page,
        limit: 10,
      });

      setReports(res.items);
      setTotalPages(res.totalPages || 1);
      setTotal(res.total);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat daftar laporan';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleCancelReport = async (submissionId: string, reason: string) => {
    const submissionService = registry.getServices().submissions;
    await submissionService.cancelSubmission(submissionId, reason);
    await fetchReports();
  };

  return {
    reports,
    statusFilter,
    setStatusFilter: (status: StudentFilterStatus) => {
      setStatusFilter(status);
      setPage(1);
    },
    page,
    setPage,
    totalPages,
    total,
    isLoading,
    error,
    refresh: fetchReports,
    cancelReport: handleCancelReport,
  };
};

