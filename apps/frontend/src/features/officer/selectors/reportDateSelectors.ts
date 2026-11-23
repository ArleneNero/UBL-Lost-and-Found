export type ReportPeriodMode = 'day' | 'week' | 'month' | 'year' | 'custom';

export interface ReportDateRangeParams {
  date?: string;
  weekDate?: string;
  month?: string;
  year?: string;
  startDate?: string;
  endDate?: string;
}

export interface ReportDateRange {
  startDate: string;
  endDate: string;
  periodLabel: string;
}

const WIB_TIMEZONE = 'Asia/Jakarta';

const wibDateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: WIB_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const idDateFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: WIB_TIMEZONE,
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const idMonthFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: WIB_TIMEZONE,
  month: 'long',
  year: 'numeric',
});

export function toLocalDateKey(isoString: string): string {
  if (!isoString) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoString)) return isoString;
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) return '';
  return wibDateKeyFormatter.format(parsed);
}

function isValidDateKey(value?: string): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  return utc.getUTCFullYear() === y && utc.getUTCMonth() === m - 1 && utc.getUTCDate() === d;
}

function addDays(dateKey: string, deltaDays: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + deltaDays)).toISOString().slice(0, 10);
}

function formatDateId(dateKey: string): string {
  const anchor = new Date(`${dateKey}T12:00:00+07:00`);
  return Number.isNaN(anchor.getTime()) ? dateKey : idDateFormatter.format(anchor);
}

export function resolveReportDateRange(
  mode: ReportPeriodMode,
  params: ReportDateRangeParams = {}
): ReportDateRange {
  const today = wibDateKeyFormatter.format(new Date());
  if (mode === 'day') {
    const d = isValidDateKey(params.date) ? params.date : today;
    return { startDate: d, endDate: d, periodLabel: formatDateId(d) };
  }
  if (mode === 'week') {
    const anchor = isValidDateKey(params.weekDate) ? params.weekDate : today;
    const [y, m, d] = anchor.split('-').map(Number);
    const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    const startDate = addDays(anchor, dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
    const endDate = addDays(startDate, 6);
    return { startDate, endDate, periodLabel: `${formatDateId(startDate)} – ${formatDateId(endDate)}` };
  }
  if (mode === 'month') {
    const mStr = params.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month) ? params.month : today.slice(0, 7);
    const [y, m] = mStr.split('-').map(Number);
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const startDate = `${mStr}-01`;
    return {
      startDate,
      endDate: `${mStr}-${String(lastDay).padStart(2, '0')}`,
      periodLabel: idMonthFormatter.format(new Date(`${startDate}T12:00:00+07:00`)),
    };
  }
  if (mode === 'year') {
    const yr = params.year && /^\d{4}$/.test(params.year) ? params.year : today.slice(0, 4);
    return { startDate: `${yr}-01-01`, endDate: `${yr}-12-31`, periodLabel: `Tahun ${yr}` };
  }
  const s = isValidDateKey(params.startDate) ? params.startDate : today;
  const e = isValidDateKey(params.endDate) ? params.endDate : s;
  const [startDate, endDate] = s <= e ? [s, e] : [e, s];
  return {
    startDate,
    endDate,
    periodLabel: startDate === endDate ? formatDateId(startDate) : `${formatDateId(startDate)} – ${formatDateId(endDate)}`,
  };
}
