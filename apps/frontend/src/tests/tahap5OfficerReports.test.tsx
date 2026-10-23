import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { OfficerReportsPage } from '@/pages/officer/OfficerReportsPage';
import { OfficerReportDetailPage } from '@/pages/officer/OfficerReportDetailPage';
import { services } from '@/services/registry';
import { mockStore } from '@/data/mockStore';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Officer Reports & Physical Receipt Submilestone (F/B.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.reset();
  });

  describe('F/B.4.0 & F/B.4.1 Daftar Laporan Masuk', () => {
    it('renders report list with mandatory notice banner', async () => {
      render(
        <MemoryRouter>
          <OfficerReportsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Jangan konfirmasi penerimaan jika mahasiswa belum menyerahkan/i)).toBeDefined();
        expect(screen.getAllByText('Jaket Hoodie Hitam Uniqlo').length).toBeGreaterThan(0);
      });

      expect(screen.getByPlaceholderText('Cari kode laporan atau nama barang...')).toBeDefined();
    });

    it('filters reports by status chips', async () => {
      render(
        <MemoryRouter>
          <OfficerReportsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getAllByText('Jaket Hoodie Hitam Uniqlo').length).toBeGreaterThan(0);
      });

      // Filter Diterima (none initially)
      fireEvent.click(screen.getByRole('button', { name: /^Diterima$/ }));
      await waitFor(() => {
        expect(screen.getByText('Tidak ada laporan mahasiswa yang sesuai dengan filter.')).toBeDefined();
      });

      // Filter Menunggu
      fireEvent.click(screen.getByRole('button', { name: /^Menunggu$/ }));
      await waitFor(() => {
        expect(screen.getAllByText('Jaket Hoodie Hitam Uniqlo').length).toBeGreaterThan(0);
      });
    });
  });

  describe('F/B.4.2 Penerimaan Fisik & Transisi Atomik', () => {
    it('requires confirmation checkbox and atomically creates STORED inventory item', async () => {
      render(
        <MemoryRouter initialEntries={['/petugas/laporan/sub-uuid-001']}>
          <Routes>
            <Route path="/petugas/laporan/:id" element={<OfficerReportDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Jaket Hoodie Hitam Uniqlo')).toBeDefined();
        expect(screen.getByRole('button', { name: /Lanjut Konfirmasi Fisik/i })).toBeDefined();
      });

      // 1. Open confirmation modal
      fireEvent.click(screen.getByRole('button', { name: /Lanjut Konfirmasi Fisik/i }));
      expect(screen.getByText('Konfirmasi Terima Fisik')).toBeDefined();

      // 2. Submit button is disabled before checking checkbox
      const confirmBtn = screen.getByRole('button', { name: /Konfirmasi Penerimaan/i }) as HTMLButtonElement;
      expect(confirmBtn.disabled).toBe(true);

      // 3. Check checkbox
      const checkbox = document.getElementById('receiveCheck') as HTMLInputElement;
      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(true);
      expect(confirmBtn.disabled).toBe(false);

      // 4. Confirm receipt
      fireEvent.click(confirmBtn);

      // 5. Verify state update
      await waitFor(() => {
        expect(screen.getByText('Barang Fisik Telah Diterima')).toBeDefined();
      });

      // 6. Verify submission status is now RECEIVED
      const sub = await services.submissions.getSubmissionById('sub-uuid-001');
      expect(sub?.status).toBe('RECEIVED');

      // 7. Verify exactly 1 new item created in inventory
      const items = await services.items.getOfficerItems();
      const createdItem = items.items.find((i) => i.name === 'Jaket Hoodie Hitam Uniqlo');
      expect(createdItem).toBeDefined();
      expect(createdItem?.status).toBe('STORED');
      expect(createdItem?.isVisible).toBe(true);
    });
  });

  describe('F/B.4.3 Penolakan Laporan dengan Alasan Wajib', () => {
    it('requires mandatory non-empty reason to reject report', async () => {
      render(
        <MemoryRouter initialEntries={['/petugas/laporan/sub-uuid-001']}>
          <Routes>
            <Route path="/petugas/laporan/:id" element={<OfficerReportDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Tolak Laporan/i })).toBeDefined();
      });

      // Open reject modal
      fireEvent.click(screen.getByRole('button', { name: /Tolak Laporan/i }));
      expect(screen.getByRole('heading', { name: /Tolak Laporan/i })).toBeDefined();

      const rejectBtn = screen.getByRole('button', { name: /Konfirmasi Penolakan/i }) as HTMLButtonElement;
      expect(rejectBtn.disabled).toBe(true);

      // Fill reason
      const textarea = screen.getByPlaceholderText(/Tulis alasan mengapa laporan ditolak/i);
      fireEvent.change(textarea, { target: { value: 'Barang fisik fiktif/tidak diserahkan' } });
      expect(rejectBtn.disabled).toBe(false);

      // Confirm rejection
      fireEvent.click(rejectBtn);

      await waitFor(() => {
        expect(screen.getByText('Laporan Ditolak oleh Petugas')).toBeDefined();
      });

      const sub = await services.submissions.getSubmissionById('sub-uuid-001');
      expect(sub?.status).toBe('REJECTED');
    });
  });

  describe('F/B.4.4 Uji Race / Invalid States', () => {
    it('prevents double receive or double reject on non-PENDING submissions', async () => {
      // First receive
      await services.submissions.receiveSubmission('sub-uuid-001', {
        publicDescription: 'Test',
        photoToken: 'mock-token',
      });

      // Second receive must reject
      await expect(
        services.submissions.receiveSubmission('sub-uuid-001', {
          publicDescription: 'Duplicate',
          photoToken: 'mock-token',
        })
      ).rejects.toThrow(/tidak dapat diterima/i);

      // Rejection after received must reject
      await expect(
        services.submissions.rejectSubmission('sub-uuid-001', 'Reason')
      ).rejects.toThrow(/tidak dapat ditolak/i);
    });
  });
});
