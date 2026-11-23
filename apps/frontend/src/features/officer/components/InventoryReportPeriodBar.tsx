import React from 'react';
import { clsx } from 'clsx';
import { Select, SelectOption } from '@/components/ui/Select';
import { ReportPeriodMode } from '../selectors/reportDateSelectors';

const PERIOD_TABS: Array<{ mode: ReportPeriodMode; label: string }> = [
  { mode: 'day', label: 'Harian' },
  { mode: 'week', label: 'Mingguan' },
  { mode: 'month', label: 'Bulanan' },
  { mode: 'year', label: 'Tahunan' },
  { mode: 'custom', label: 'Kustom' },
];

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'ALL', label: 'Semua Status' },
  { value: 'STORED', label: 'Tersedia di Pos' },
  { value: 'RETURNED_TO_OWNER', label: 'Sudah Diserahkan' },
  { value: 'DISTRIBUTED', label: 'Disalurkan' },
];

const inputClassName =
  'w-full h-[42px] bg-white text-sm text-[var(--lf-ink)] px-3 border border-[var(--lf-border)] rounded-[10px] focus:outline-none focus:border-[var(--lf-blue)]';

export interface InventoryReportPeriodBarProps {
  mode: ReportPeriodMode;
  date: string;
  weekDate: string;
  month: string;
  year: string;
  startDate: string;
  endDate: string;
  statusFilter: string;
  periodLabel: string;
  onModeChange: (mode: ReportPeriodMode) => void;
  onDateChange: (val: string) => void;
  onWeekDateChange: (val: string) => void;
  onMonthChange: (val: string) => void;
  onYearChange: (val: string) => void;
  onStartDateChange: (val: string) => void;
  onEndDateChange: (val: string) => void;
  onStatusFilterChange: (val: string) => void;
}

export const InventoryReportPeriodBar: React.FC<InventoryReportPeriodBarProps> = ({
  mode, date, weekDate, month, year, startDate, endDate, statusFilter, periodLabel,
  onModeChange, onDateChange, onWeekDateChange, onMonthChange, onYearChange,
  onStartDateChange, onEndDateChange, onStatusFilterChange,
}) => (
  <div className="px-6 py-4 bg-[#F9FAFB] border-b border-[var(--lf-border)] space-y-4 shrink-0">
    <div role="tablist" aria-label="Periode Laporan" className="flex flex-wrap gap-1.5">
      {PERIOD_TABS.map((tab) => {
        const active = mode === tab.mode;
        return (
          <button
            key={tab.mode}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onModeChange(tab.mode)}
            className={clsx(
              'px-3.5 py-1.5 rounded-[10px] text-xs font-semibold transition-colors cursor-pointer',
              active
                ? 'bg-[var(--lf-action)] text-white shadow-xs'
                : 'bg-white text-[var(--lf-muted)] border border-[var(--lf-border)] hover:text-[var(--lf-ink)]'
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
      <div className="md:col-span-2">
        {mode === 'day' && (
          <label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--lf-ink)]">
            <span>Tanggal (WIB)</span>
            <input type="date" value={date} onChange={(e) => onDateChange(e.target.value)} className={inputClassName} />
          </label>
        )}
        {mode === 'week' && (
          <div className="flex flex-col gap-1.5">
            <label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--lf-ink)]">
              <span>Pilih Tanggal dalam Minggu (Senin–Minggu)</span>
              <input type="date" value={weekDate} onChange={(e) => onWeekDateChange(e.target.value)} className={inputClassName} />
            </label>
            <span className="text-[11px] text-[var(--lf-muted)]">Rentang: {periodLabel}</span>
          </div>
        )}
        {mode === 'month' && (
          <label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--lf-ink)]">
            <span>Bulan</span>
            <input type="month" value={month} onChange={(e) => onMonthChange(e.target.value)} className={inputClassName} />
          </label>
        )}
        {mode === 'year' && (
          <label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--lf-ink)]">
            <span>Tahun</span>
            <input type="number" min={2020} max={2100} value={year} onChange={(e) => onYearChange(e.target.value)} className={inputClassName} />
          </label>
        )}
        {mode === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--lf-ink)]">
              <span>Dari Tanggal</span>
              <input type="date" value={startDate} onChange={(e) => onStartDateChange(e.target.value)} className={inputClassName} />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--lf-ink)]">
              <span>Sampai Tanggal</span>
              <input type="date" value={endDate} onChange={(e) => onEndDateChange(e.target.value)} className={inputClassName} />
            </label>
          </div>
        )}
      </div>
      <div>
        <Select label="Filter Status" value={statusFilter} onChange={(e) => onStatusFilterChange(e.target.value)} options={STATUS_OPTIONS} className="!h-[42px] !rounded-[10px]" />
      </div>
    </div>
  </div>
);
