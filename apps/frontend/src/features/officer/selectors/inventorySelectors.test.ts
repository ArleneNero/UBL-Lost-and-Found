import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { FoundItem } from '@/types/domain';
import {
  DEFAULT_STORAGE_LIMIT_DAYS,
  isItemOverdue,
} from './inventorySelectors';
import { toLocalDateKey, resolveReportDateRange } from './reportDateSelectors';
import { filterItemsByReportRange, summarizeInventoryReport } from './reportSummarySelectors';
import {
  InventoryReportSheet,
  InventoryReportSheetProps,
} from '../components/InventoryReportSheet';
import { InventoryReportPrintModal } from '../components/InventoryReportPrintModal';

function makeItem(overrides: Partial<FoundItem> = {}): FoundItem {
  return {
    id: 'item-1',
    inventoryCode: 'INV-2026-0001',
    name: 'Kunci Motor Honda',
    category: 'Kunci',
    description: 'Gantungan hitam',
    foundLocation: 'Parkiran Motor',
    foundDate: '2026-11-23',
    receivedAt: '2026-11-23T03:00:00Z',
    postId: 1,
    postName: 'Pos Pengajaran',
    photoUrl: '/photo.jpg',
    status: 'STORED',
    isVisible: true,
    privateNotes: 'Ada stiker rahasia 7788',
    ...overrides,
  };
}

describe('inventorySelectors', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('DEFAULT_STORAGE_LIMIT_DAYS & isItemOverdue', () => {
    it('uses 365 days as the default storage limit', () => {
      expect(DEFAULT_STORAGE_LIMIT_DAYS).toBe(365);

      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-11-23T00:00:00Z'));

      const day365 = '2025-11-23T00:00:00Z';
      const day366 = '2025-11-22T00:00:00Z';

      expect(isItemOverdue(day365)).toBe(false);
      expect(isItemOverdue(day366)).toBe(true);
    });

    it('prefers item.storageLimitDays over default or fallback parameter', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-11-23T00:00:00Z'));

      const receivedAt = '2026-10-01T00:00:00Z'; // 53 days ago
      expect(isItemOverdue({ receivedAt, storageLimitDays: 30 })).toBe(true);
      expect(isItemOverdue({ receivedAt, storageLimitDays: 60 }, 30)).toBe(false);
      expect(isItemOverdue({ receivedAt, storageLimitDays: null }, 45)).toBe(true);
    });
  });

  describe('toLocalDateKey', () => {
    it('converts UTC ISO timestamps into WIB (Asia/Jakarta) YYYY-MM-DD keys', () => {
      expect(toLocalDateKey('2026-11-22T17:30:00Z')).toBe('2026-11-23');
      expect(toLocalDateKey('2026-11-22T16:59:59Z')).toBe('2026-11-22');
      expect(toLocalDateKey('2026-01-01T00:00:00+07:00')).toBe('2026-01-01');
    });

    it('returns empty string for empty or invalid timestamps', () => {
      expect(toLocalDateKey('')).toBe('');
      expect(toLocalDateKey('not-a-date')).toBe('');
    });
  });

  describe('resolveReportDateRange', () => {
    it('resolves day mode to a single exact WIB date', () => {
      const range = resolveReportDateRange('day', { date: '2026-11-23' });
      expect(range.startDate).toBe('2026-11-23');
      expect(range.endDate).toBe('2026-11-23');
      expect(range.periodLabel).toContain('2026');
    });

    it('resolves week mode to Monday through Sunday containing weekDate', () => {
      const midWeek = resolveReportDateRange('week', { weekDate: '2026-11-25' }); // Wednesday
      expect(midWeek.startDate).toBe('2026-11-23'); // Monday
      expect(midWeek.endDate).toBe('2026-11-29'); // Sunday

      const monday = resolveReportDateRange('week', { weekDate: '2026-11-23' });
      expect(monday.startDate).toBe('2026-11-23');
      expect(monday.endDate).toBe('2026-11-29');

      const sunday = resolveReportDateRange('week', { weekDate: '2026-11-29' });
      expect(sunday.startDate).toBe('2026-11-23');
      expect(sunday.endDate).toBe('2026-11-29');

      const crossYear = resolveReportDateRange('week', { weekDate: '2025-12-31' });
      expect(crossYear.startDate).toBe('2025-12-29');
      expect(crossYear.endDate).toBe('2026-01-04');
    });

    it('resolves month mode including leap year Feb 2024 vs non-leap Feb 2026', () => {
      const leapFeb = resolveReportDateRange('month', { month: '2024-02' });
      expect(leapFeb.startDate).toBe('2024-02-01');
      expect(leapFeb.endDate).toBe('2024-02-29');

      const nonLeapFeb = resolveReportDateRange('month', { month: '2026-02' });
      expect(nonLeapFeb.startDate).toBe('2026-02-01');
      expect(nonLeapFeb.endDate).toBe('2026-02-28');

      const nov = resolveReportDateRange('month', { month: '2026-11' });
      expect(nov.startDate).toBe('2026-11-01');
      expect(nov.endDate).toBe('2026-11-30');
    });

    it('resolves year mode to full calendar year boundaries', () => {
      const range = resolveReportDateRange('year', { year: '2026' });
      expect(range.startDate).toBe('2026-01-01');
      expect(range.endDate).toBe('2026-12-31');
      expect(range.periodLabel).toBe('Tahun 2026');
    });

    it('resolves custom mode and normalizes reversed dates', () => {
      const normal = resolveReportDateRange('custom', {
        startDate: '2026-11-01',
        endDate: '2026-11-15',
      });
      expect(normal.startDate).toBe('2026-11-01');
      expect(normal.endDate).toBe('2026-11-15');

      const reversed = resolveReportDateRange('custom', {
        startDate: '2026-11-20',
        endDate: '2026-11-05',
      });
      expect(reversed.startDate).toBe('2026-11-05');
      expect(reversed.endDate).toBe('2026-11-20');
    });
  });

  describe('filterItemsByReportRange', () => {
    it('filters by WIB date boundaries and optional statusFilter', () => {
      const items = [
        makeItem({ id: '1', receivedAt: '2026-11-22T16:59:59Z', status: 'STORED' }), // 2026-11-22 WIB
        makeItem({ id: '2', receivedAt: '2026-11-22T17:30:00Z', status: 'STORED' }), // 2026-11-23 WIB
        makeItem({ id: '3', receivedAt: '2026-11-23T10:00:00Z', status: 'RETURNED_TO_OWNER' }), // 2026-11-23 WIB
        makeItem({ id: '4', receivedAt: '2026-11-24T01:00:00Z', status: 'DISTRIBUTED' }), // 2026-11-24 WIB
      ];

      const day23All = filterItemsByReportRange(items, '2026-11-23', '2026-11-23', 'ALL');
      expect(day23All.map((i) => i.id)).toEqual(['2', '3']);

      const day23Returned = filterItemsByReportRange(
        items,
        '2026-11-23',
        '2026-11-23',
        'RETURNED_TO_OWNER'
      );
      expect(day23Returned.map((i) => i.id)).toEqual(['3']);
    });
  });

  describe('summarizeInventoryReport', () => {
    it('computes totals, status counts, overdue STORED items, and sorted category breakdown', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-11-23T00:00:00Z'));

      const items: FoundItem[] = [
        makeItem({ id: '1', category: 'Elektronik', status: 'STORED', receivedAt: '2025-10-01T00:00:00Z' }), // overdue
        makeItem({ id: '2', category: 'Elektronik', status: 'STORED', receivedAt: '2026-11-20T00:00:00Z' }),
        makeItem({ id: '3', category: 'Kunci', status: 'RETURNED_TO_OWNER', receivedAt: '2025-01-01T00:00:00Z' }), // returned, not overdue
        makeItem({ id: '4', category: 'Dompet', status: 'DISTRIBUTED', receivedAt: '2025-01-01T00:00:00Z' }), // distributed, not overdue
        makeItem({ id: '5', category: 'Elektronik', status: 'RETURNED_TO_OWNER', receivedAt: '2026-11-21T00:00:00Z' }),
      ];

      const summary = summarizeInventoryReport(items);

      expect(summary.total).toBe(5);
      expect(summary.stored).toBe(2);
      expect(summary.returned).toBe(2);
      expect(summary.distributed).toBe(1);
      expect(summary.overdue).toBe(1);
      expect(summary.byCategory).toEqual([
        { category: 'Elektronik', count: 3 },
        { category: 'Dompet', count: 1 },
        { category: 'Kunci', count: 1 },
      ]);
    });
  });
});

describe('InventoryReportSheet & InventoryReportPrintModal rendering', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders official Pos Pengajaran report sheet and strictly excludes privateNotes', () => {
    const items = [
      makeItem({
        id: 'item-a',
        inventoryCode: 'INV-2026-0099',
        name: 'Laptop Asus Vivobook',
        category: 'Elektronik',
        foundLocation: 'Ruang 4.102',
        receivedAt: '2026-11-23T04:00:00Z',
        status: 'STORED',
        privateNotes: 'PIN-RAHASIA-9999',
      }),
    ];
    const summary = summarizeInventoryReport(items);

    render(
      React.createElement(InventoryReportSheet, {
        items,
        summary,
        periodLabel: 'November 2026',
        generatedAt: '2026-11-23T07:00:00Z',
      })
    );

    expect(screen.getByText(/Pos Pengajaran — Gedung Unit 4 Lt\. 1/)).toBeDefined();
    expect(screen.getByText('Laporan Inventaris Barang Temuan')).toBeDefined();
    expect(screen.getByText('INV-2026-0099')).toBeDefined();
    expect(screen.getByText('Laptop Asus Vivobook')).toBeDefined();
    expect(screen.getByText('Ruang 4.102')).toBeDefined();
    expect(screen.queryByText(/PIN-RAHASIA-9999/)).toBeNull();
    expect(screen.queryByText(/Catatan Rahasia/i)).toBeNull();
  });

  it('fetches items in InventoryReportPrintModal, updates onReportChange, and triggers window.print()', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    const onReportChange = vi.fn<(props: InventoryReportSheetProps | null) => void>();
    const todayIso = new Date().toISOString();
    const fetchItems = vi.fn().mockResolvedValue([
      makeItem({
        id: 'item-modal-1',
        inventoryCode: 'INV-2026-0123',
        name: 'Tumbler Corkcicle',
        receivedAt: todayIso,
      }),
    ]);

    render(
      React.createElement(InventoryReportPrintModal, {
        isOpen: true,
        onClose: vi.fn(),
        fetchItems,
        onReportChange,
      })
    );

    await waitFor(() => {
      expect(screen.getByText('Tumbler Corkcicle')).toBeDefined();
      const nonNullCall = [...onReportChange.mock.calls].reverse().find((c) => c[0] !== null)?.[0];
      expect(nonNullCall?.items).toHaveLength(1);
    });

    expect(screen.getByRole('tab', { name: 'Harian' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Mingguan' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Bulanan' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Tahunan' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Kustom' })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /Cetak \/ Simpan PDF/i }));
    expect(printSpy).toHaveBeenCalledTimes(1);
  });
});
