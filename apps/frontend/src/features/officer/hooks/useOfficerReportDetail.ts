import { useState, useEffect, useCallback } from 'react';
import { Submission, FoundItem } from '@/types/domain';
import { services } from '@/services/registry';
import { ReceiveSubmissionInput } from '@/services/contracts/ISubmissionService';

export interface UseOfficerReportDetailReturn {
  submission: Submission | null;
  createdItem: FoundItem | null;
  isLoading: boolean;
  error: string | null;
  isActionLoading: boolean;
  receive: (input: ReceiveSubmissionInput) => Promise<FoundItem | null>;
  reject: (reason: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useOfficerReportDetail(id: string | undefined): UseOfficerReportDetailReturn {
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [createdItem, setCreatedItem] = useState<FoundItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!id) {
      setError('ID laporan tidak valid');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await services.submissions.getSubmissionById(id);
      if (!res) {
        setError('Laporan mahasiswa tidak ditemukan');
      } else {
        setSubmission(res);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat detail laporan');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const receive = async (input: ReceiveSubmissionInput): Promise<FoundItem | null> => {
    if (!submission) return null;
    setIsActionLoading(true);
    try {
      const item = await services.submissions.receiveSubmission(submission.id, input);
      setCreatedItem(item);
      setSubmission((prev) => (prev ? { ...prev, status: 'RECEIVED' } : null));
      return item;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menerima barang fisik');
      return null;
    } finally {
      setIsActionLoading(false);
    }
  };

  const reject = async (reason: string): Promise<boolean> => {
    if (!submission) return false;
    setIsActionLoading(true);
    try {
      const updated = await services.submissions.rejectSubmission(submission.id, reason);
      setSubmission(updated);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menolak laporan');
      return false;
    } finally {
      setIsActionLoading(false);
    }
  };

  return {
    submission,
    createdItem,
    isLoading,
    error,
    isActionLoading,
    receive,
    reject,
    refetch: fetchDetail,
  };
}
