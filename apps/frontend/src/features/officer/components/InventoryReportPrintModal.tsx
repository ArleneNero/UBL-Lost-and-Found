import React, { useState, useEffect, useMemo, useCallback, useId } from 'react';
import { Printer, X, Calendar } from 'lucide-react';
import { FoundItem } from '@/types/domain';
import { ItemStatus } from '@/types/api';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import {
  ReportPeriodMode,
  toLocalDateKey,
  resolveReportDateRange,
} from '../selectors/reportDateSelectors';
import {
  filterItemsByReportRange,
  summarizeInventoryReport,
} from '../selectors/reportSummarySelectors';
import {
  InventoryReportSheet,
  InventoryReportSheetProps,
} from './InventoryReportSheet';
import { InventoryReportPeriodBar } from './InventoryReportPeriodBar';

export interface InventoryReportPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  fetchItems: () => Promise<FoundItem[]>;
  onReportChange?: (props: InventoryReportSheetProps | null) => void;
}

type ReportStatusFilter = 'ALL' | ItemStatus;

export const InventoryReportPrintModal: React.FC<InventoryReportPrintModalProps> = ({
  isOpen,
  onClose,
  fetchItems,
  onReportChange,
}) => {
  const titleId = useId();
  const initialToday = useMemo(() => toLocalDateKey(new Date().toISOString()), []);

  const [mode, setMode] = useState<ReportPeriodMode>('month');
  const [date, setDate] = useState(initialToday);
  const [weekDate, setWeekDate] = useState(initialToday);
  const [month, setMonth] = useState(initialToday.slice(0, 7));
  const [year, setYear] = useState(initialToday.slice(0, 4));
  const [startDate, setStartDate] = useState(`${initialToday.slice(0, 7)}-01`);
  const [endDate, setEndDate] = useState(initialToday);
  const [statusFilter, setStatusFilter] = useState<ReportStatusFilter>('ALL');

  const [items, setItems] = useState<FoundItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState(() => new Date().toISOString());

  const loadAllItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetched = await fetchItems();
      setItems(fetched);
      setGeneratedAt(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data laporan inventaris.');
    } finally {
      setIsLoading(false);
    }
  }, [fetchItems]);

  useEffect(() => {
    if (isOpen) void loadAllItems();
  }, [isOpen, loadAllItems]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const dateRange = useMemo(
    () => resolveReportDateRange(mode, { date, weekDate, month, year, startDate, endDate }),
    [mode, date, weekDate, month, year, startDate, endDate]
  );

  const filteredItems = useMemo(
    () => filterItemsByReportRange(items, dateRange.startDate, dateRange.endDate, statusFilter),
    [items, dateRange.startDate, dateRange.endDate, statusFilter]
  );

  const summary = useMemo(() => summarizeInventoryReport(filteredItems), [filteredItems]);

  const sheetProps = useMemo<InventoryReportSheetProps | null>(() => {
    if (!isOpen || isLoading || error) return null;
    return { items: filteredItems, summary, periodLabel: dateRange.periodLabel, generatedAt };
  }, [isOpen, isLoading, error, filteredItems, summary, dateRange.periodLabel, generatedAt]);

  useEffect(() => {
    onReportChange?.(sheetProps);
    return () => {
      onReportChange?.(null);
    };
  }, [sheetProps, onReportChange]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
      <div className="fixed inset-0 bg-black/45 backdrop-blur-xs" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-5xl bg-white rounded-[20px] shadow-[0_16px_36px_rgba(16,24,40,0.18)] border border-[var(--lf-border)] flex flex-col max-h-[92vh] overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--lf-border)] shrink-0">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-[var(--lf-action)]" />
            <h3 id={titleId} className="text-base font-semibold text-[var(--lf-ink)]">
              Cetak Laporan Inventaris
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-[var(--lf-muted)] hover:bg-[#F2F4F7] hover:text-[var(--lf-ink)] cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <InventoryReportPeriodBar
          mode={mode}
          date={date}
          weekDate={weekDate}
          month={month}
          year={year}
          startDate={startDate}
          endDate={endDate}
          statusFilter={statusFilter}
          periodLabel={dateRange.periodLabel}
          onModeChange={setMode}
          onDateChange={setDate}
          onWeekDateChange={setWeekDate}
          onMonthChange={setMonth}
          onYearChange={setYear}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onStatusFilterChange={(val) => setStatusFilter(val as ReportStatusFilter)}
        />

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-100">
          {isLoading ? (
            <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
              <Skeleton height={48} className="w-2/3" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((n) => (
                  <Skeleton key={n} height={64} className="w-full" />
                ))}
              </div>
              <Skeleton height={180} className="w-full" />
            </div>
          ) : error ? (
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <ErrorState title="Gagal Memuat Data Laporan" description={error} onRetry={() => void loadAllItems()} />
            </div>
          ) : (
            sheetProps && <InventoryReportSheet {...sheetProps} />
          )}
        </div>

        <div className="px-6 py-3.5 bg-[#F9FAFB] border-t border-[var(--lf-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-[var(--lf-muted)]">
            {isLoading
              ? 'Memuat data inventaris...'
              : error
                ? 'Data gagal dimuat'
                : `Menampilkan ${filteredItems.length} barang pada periode ${dateRange.periodLabel}`}
          </span>
          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Tutup
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Printer className="w-4 h-4" />}
              disabled={isLoading || Boolean(error)}
              onClick={() => window.print()}
            >
              Cetak / Simpan PDF
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
