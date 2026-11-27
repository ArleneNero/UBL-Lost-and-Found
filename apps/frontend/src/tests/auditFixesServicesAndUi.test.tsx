import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, renderHook } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HttpSubmissionService } from '@/services/http/HttpSubmissionService';
import { HttpItemService } from '@/services/http/HttpItemService';
import { HttpPostService } from '@/services/http/HttpPostService';
import * as apiClientModule from '@/services/http/apiClient';
import { registry, services } from '@/services/registry';
import { mockStore } from '@/data/mockStore';
import { useOfficerDashboard } from '@/features/officer/hooks/useOfficerDashboard';
import { useOfficerReports } from '@/features/officer/hooks/useOfficerReports';
import { useOfficerItemDetail } from '@/features/officer/hooks/useOfficerItemDetail';
import { useStudentProfile } from '@/features/student/hooks/useStudentProfile';
import { useCreateReport } from '@/features/student/hooks/useCreateReport';
import { ItemDetailPage } from '@/pages/ItemDetailPage';
import { PostsPage } from '@/pages/PostsPage';
import { OfficerRegisterItemPage } from '@/pages/officer/OfficerRegisterItemPage';
import { OfficerReportDetailPage } from '@/pages/officer/OfficerReportDetailPage';
import { ReportFoundForm } from '@/features/student/components/ReportFoundForm';
import { toLocalDateKey } from '@/features/officer/selectors/reportDateSelectors';

describe('Audit Fixes — Services, Pagination, Forms & UI (FIND-14, 21, 23, 24, 29)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockStore.reset();
    registry.setMode('in-memory');
  });

  afterEach(() => {
    registry.setMode('in-memory');
  });

  describe('FIND-14: Explicit service endpoints without mockStore dependency', () => {
    it('HttpSubmissionService routes getOfficerSubmissions and getMySubmissions independently of mockStore', async () => {
      mockStore.getState().currentUser = null;
      const svc = new HttpSubmissionService();
      const apiSpy = vi.spyOn(apiClientModule, 'apiClient').mockResolvedValue({
        data: [],
        meta: { total: 0, total_pages: 1, page: 1, limit: 10 },
      });

      await svc.getOfficerSubmissions({ page: 2, limit: 25 });
      expect(apiSpy).toHaveBeenCalledWith('/officer/submissions?page=2&limit=25');

      await svc.getMySubmissions({ page: 1, limit: 10 });
      expect(apiSpy).toHaveBeenCalledWith('/submissions/me?page=1&limit=10');
    });

    it('HttpItemService.getOfficerItemById calls /officer/items/:id even when mockStore.currentUser is null', async () => {
      mockStore.getState().currentUser = null;
      const svc = new HttpItemService();
      const apiSpy = vi.spyOn(apiClientModule, 'apiClient').mockResolvedValue({
        data: mockStore.getState().items[0],
      });

      const item = await svc.getOfficerItemById('item-uuid-001');
      expect(apiSpy).toHaveBeenCalledWith('/officer/items/item-uuid-001');
      expect(item?.id).toBe('item-uuid-001');
    });

    it('useOfficerItemDetail calls getOfficerItemById directly instead of getItemById', async () => {
      const officerSpy = vi.spyOn(services.items, 'getOfficerItemById');
      const genericSpy = vi.spyOn(services.items, 'getItemById');

      const { result } = renderHook(() => useOfficerItemDetail('item-uuid-001'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(officerSpy).toHaveBeenCalledWith('item-uuid-001');
      expect(genericSpy).not.toHaveBeenCalled();
      expect(result.current.item?.id).toBe('item-uuid-001');
    });
  });

  describe('FIND-21: Multi-page aggregation across > 10 submissions & > 1 page items', () => {
    it('aggregates all pages in useOfficerDashboard, useOfficerReports, and useStudentProfile', async () => {
      const sampleItem = await services.items.getOfficerItemById('item-uuid-001');
      const sampleSub = await services.submissions.getSubmissionById('sub-uuid-001');
      expect(sampleItem).not.toBeNull();
      expect(sampleSub).not.toBeNull();

      vi.spyOn(services.items, 'getOfficerItems').mockImplementation(async (params) => {
        const page = params?.page ?? 1;
        return {
          items: Array.from({ length: 10 }, (_, idx) => ({
            ...sampleItem!,
            id: `item-p${page}-${idx}`,
            status: page === 1 ? 'STORED' : 'RETURNED_TO_OWNER',
          })),
          page,
          limit: 10,
          total: 20,
          totalPages: 2,
        };
      });

      vi.spyOn(services.submissions, 'getOfficerSubmissions').mockImplementation(async (params) => {
        const page = params?.page ?? 1;
        return {
          items: Array.from({ length: page === 1 ? 10 : 5 }, (_, idx) => ({
            ...sampleSub!,
            id: `sub-p${page}-${idx}`,
            status: 'PENDING_RECEIPT',
          })),
          page,
          limit: 10,
          total: 15,
          totalPages: 2,
        };
      });

      vi.spyOn(services.submissions, 'getMySubmissions').mockImplementation(async (params) => {
        const page = params?.page ?? 1;
        return {
          items: Array.from({ length: page === 1 ? 10 : 4 }, (_, idx) => ({
            ...sampleSub!,
            id: `my-sub-p${page}-${idx}`,
            status: page === 1 ? 'PENDING_RECEIPT' : 'RECEIVED',
          })),
          page,
          limit: 10,
          total: 14,
          totalPages: 2,
        };
      });

      const dash = renderHook(() => useOfficerDashboard());
      await waitFor(() => expect(dash.result.current.isLoading).toBe(false));
      expect(dash.result.current.metrics.totalStored).toBe(10);
      expect(dash.result.current.metrics.totalReturned).toBe(10);
      expect(dash.result.current.metrics.totalPendingReports).toBe(15);

      const reports = renderHook(() => useOfficerReports(), {
        wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
      });
      await waitFor(() => expect(reports.result.current.isLoading).toBe(false));
      expect(reports.result.current.submissions.length).toBe(15);

      const profile = renderHook(() => useStudentProfile());
      await waitFor(() => expect(profile.result.current.isLoading).toBe(false));
      expect(profile.result.current.stats.totalReports).toBe(14);
      expect(profile.result.current.stats.pendingReports).toBe(10);
      expect(profile.result.current.stats.receivedReports).toBe(4);
    });
  });

  describe('FIND-23: Error propagation in HttpPostService, ItemDetailPage & PostsPage', () => {
    it('HttpPostService rethrows 5xx/network errors and returns null only on 404', async () => {
      const postSvc = new HttpPostService();

      vi.spyOn(apiClientModule, 'apiClient').mockRejectedValueOnce(
        new apiClientModule.ApiError('SERVER_ERROR', 'Internal failure', 500)
      );
      await expect(postSvc.getPosts()).rejects.toThrow('Internal failure');

      vi.spyOn(apiClientModule, 'apiClient').mockRejectedValueOnce(
        new apiClientModule.ApiError('NOT_FOUND', 'Post not found', 404)
      );
      await expect(postSvc.getPostById(99)).resolves.toBeNull();

      vi.spyOn(apiClientModule, 'apiClient').mockRejectedValueOnce(
        new apiClientModule.ApiError('SERVER_ERROR', 'Gateway error', 502)
      );
      await expect(postSvc.getPostById(1)).rejects.toThrow('Gateway error');
    });

    it('ItemDetailPage displays ErrorState with retry instead of Not Found on server error', async () => {
      const itemSpy = vi
        .spyOn(services.items, 'getPublicItemById')
        .mockRejectedValueOnce(new Error('Koneksi ke server terputus'));

      render(
        <MemoryRouter initialEntries={['/barang/item-uuid-003']}>
          <Routes>
            <Route path="/barang/:id" element={<ItemDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Gagal Memuat Detail Barang')).toBeDefined();
        expect(screen.getByText('Koneksi ke server terputus')).toBeDefined();
      });
      expect(screen.queryByText('Barang Tidak Ditemukan')).toBeNull();

      // Retry succeeds
      fireEvent.click(screen.getByRole('button', { name: /Muat Ulang/i }));
      await waitFor(() => {
        expect(screen.getByText('AirPods Pro')).toBeDefined();
      });
      expect(itemSpy).toHaveBeenCalledTimes(2);
    });

    it('PostsPage displays ErrorState with retry when getPosts fails', async () => {
      vi.spyOn(services.posts, 'getPosts').mockRejectedValueOnce(new Error('Server Pos Error'));

      render(
        <MemoryRouter>
          <PostsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Gagal Memuat Pos Pelayanan')).toBeDefined();
        expect(screen.getByText('Server Pos Error')).toBeDefined();
      });

      fireEvent.click(screen.getByRole('button', { name: /Muat Ulang/i }));
      await waitFor(() => {
        expect(screen.getByText('Pos Pengajaran')).toBeDefined();
      });
    });
  });

  describe('FIND-24: Validation, distributeItem notes payload, WIB date & read-only server time', () => {
    it('useCreateReport validates non-empty description before uploading photo', async () => {
      const uploadSpy = vi.spyOn(services.upload, 'uploadPhoto');
      const { result } = renderHook(() => useCreateReport());
      const file = new File(['abc'], 'foto.jpg', { type: 'image/jpeg' });

      await expect(
        result.current.submitReport({
          itemName: 'Dompet',
          category: 'Dompet',
          foundLocation: 'Kantin',
          foundDate: '2026-11-27',
          description: '   ',
          photoFile: file,
          agreedToPhysicalDrop: true,
        })
      ).rejects.toThrow(/Deskripsi/);

      expect(uploadSpy).not.toHaveBeenCalled();
    });

    it('HttpItemService.distributeItem sends trimmed notes JSON payload', async () => {
      const itemSvc = new HttpItemService();
      const apiSpy = vi.spyOn(apiClientModule, 'apiClient').mockResolvedValue({
        data: { ...mockStore.getState().items[0], status: 'DISTRIBUTED', is_visible: false },
      });

      await itemSvc.distributeItem('item-uuid-001', '  Disalurkan ke Panti Asuhan  ');
      expect(apiSpy).toHaveBeenCalledWith('/officer/items/item-uuid-001/distribute', {
        method: 'POST',
        body: JSON.stringify({ notes: 'Disalurkan ke Panti Asuhan' }),
      });
    });

    it('ReportFoundForm initializes foundDate in WIB and marks description required', () => {
      render(
        <ReportFoundForm isSubmitting={false} onSubmit={vi.fn()} onCancel={vi.fn()} />
      );
      const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
      const descInput = document.querySelector('textarea') as HTMLTextAreaElement;
      expect(dateInput.value).toBe(toLocalDateKey(new Date().toISOString()));
      expect(descInput.required).toBe(true);
    });

    it('OfficerRegisterItemPage renders read-only automatic server WIB receipt preview', () => {
      render(
        <MemoryRouter>
          <OfficerRegisterItemPage />
        </MemoryRouter>
      );
      expect(screen.getByText(/Waktu Penerimaan Pos \(Otomatis Server WIB\)/i)).toBeDefined();
      const datePreview = document.getElementById('received-date-preview') as HTMLInputElement;
      const timePreview = document.getElementById('received-time-preview') as HTMLInputElement;
      expect(datePreview.readOnly).toBe(true);
      expect(datePreview.disabled).toBe(true);
      expect(timePreview.readOnly).toBe(true);
      expect(timePreview.disabled).toBe(true);
    });
  });

  describe('FIND-29: OfficerReportDetailPage separates CANCELLED from REJECTED', () => {
    it('renders "Laporan Dibatalkan oleh Mahasiswa" for CANCELLED submission', async () => {
      await services.submissions.cancelSubmission('sub-uuid-001', 'Barang diambil pemilik langsung');

      render(
        <MemoryRouter initialEntries={['/petugas/laporan/sub-uuid-001']}>
          <Routes>
            <Route path="/petugas/laporan/:id" element={<OfficerReportDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Laporan Dibatalkan oleh Mahasiswa')).toBeDefined();
      });
      expect(screen.queryByText('Laporan Ditolak oleh Petugas')).toBeNull();
    });
  });
});
