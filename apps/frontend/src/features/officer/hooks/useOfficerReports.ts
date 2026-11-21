import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Submission } from '@/types/domain';
import { ReportStatus } from '@/types/api';
import { services } from '@/services/registry';

export interface UseOfficerReportsReturn {
  submissions: Submission[];
  filteredSubmissions: Submission[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: ReportStatus | 'ALL';
  setStatusFilter: (status: ReportStatus | 'ALL') => void;
  refetch: () => Promise<void>;
}

function resolveInitialReportStatus(raw: string | null): ReportStatus | 'ALL' {
  if (!raw) return 'ALL';
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'menunggu' || normalized === 'pending_receipt') return 'PENDING_RECEIPT';
  if (normalized === 'diterima' || normalized === 'received') return 'RECEIVED';
  if (normalized === 'ditolak' || normalized === 'rejected') return 'REJECTED';
  if (normalized === 'dibatalkan' || normalized === 'cancelled') return 'CANCELLED';
  return 'ALL';
}

export function useOfficerReports(): UseOfficerReportsReturn {
  const [searchParams, setSearchParams] = useSearchParams();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilterState] = useState<ReportStatus | 'ALL'>(() =>
    resolveInitialReportStatus(searchParams.get('status'))
  );

  useEffect(() => {
    setStatusFilterState(resolveInitialReportStatus(searchParams.get('status')));
  }, [searchParams]);

  const setStatusFilter = useCallback(
    (nextStatus: ReportStatus | 'ALL') => {
      setStatusFilterState(nextStatus);
      const next = new URLSearchParams(searchParams);
      if (nextStatus === 'ALL') {
        next.delete('status');
      } else if (nextStatus === 'PENDING_RECEIPT') {
        next.set('status', 'menunggu');
      } else {
        next.set('status', nextStatus);
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await services.submissions.getSubmissions({ targetPostId: 1, limit: 100 });
      setSubmissions(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat laporan');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const filteredSubmissions = useMemo(() => {
    let result = [...submissions];
    if (statusFilter !== 'ALL') {
      result = result.filter((s) => s.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.itemName.toLowerCase().includes(q) ||
          s.reportCode.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          s.foundLocation.toLowerCase().includes(q)
      );
    }
    return result;
  }, [submissions, statusFilter, searchQuery]);

  return {
    submissions,
    filteredSubmissions,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    refetch: fetchReports,
  };
}
