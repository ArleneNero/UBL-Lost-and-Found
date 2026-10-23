import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { OfficerItemDetailPage } from '@/pages/officer/OfficerItemDetailPage';
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

describe('Officer Handover, Distribution & Gate Submilestone (F/B.5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.reset();
  });

  describe('F/B.5.0 Form Pengembalian Terverifikasi', () => {
    it('renders return modal with privacy notice and requires mandatory fields & checkbox', async () => {
      render(
        <MemoryRouter initialEntries={['/petugas/inventaris/item-uuid-001']}>
          <Routes>
            <Route path="/petugas/inventaris/:id" element={<OfficerItemDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Kunci Motor Honda Vario')).toBeDefined();
        expect(screen.getByRole('button', { name: /Serah Terima Pemilik/i })).toBeDefined();
      });

      // 1. Open Return Modal
      fireEvent.click(screen.getByRole('button', { name: /Serah Terima Pemilik/i }));
      expect(screen.getByRole('heading', { name: /Proses Pengembalian Barang/i })).toBeDefined();

      // 2. Verify Privacy Notice exists and no identity upload fields are present
      expect(screen.getByText(/Jangan meminta atau menyimpan salinan foto KTP\/NIK\/KTM/i)).toBeDefined();
      expect(screen.queryByLabelText(/Foto KTP/i)).toBeNull();

      // 3. Confirm button is disabled initially
      const confirmBtn = screen.getByRole('button', { name: /Konfirmasi Serah Terima/i }) as HTMLButtonElement;
      expect(confirmBtn.disabled).toBe(true);

      // 4. Fill recipient name and verification summary
      const nameInput = screen.getByPlaceholderText(/Nama lengkap penerima/i);
      const summaryInput = screen.getByPlaceholderText(/Ciri khusus yang dicocokkan/i);
      fireEvent.change(nameInput, { target: { value: 'Budi Santoso' } });
      fireEvent.change(summaryInput, { target: { value: 'Membawa STNK dan kunci cadangan dengan nomor seri cocok' } });

      // Still disabled until checkbox checked
      expect(confirmBtn.disabled).toBe(true);

      const checkbox = document.getElementById('verifyCheck') as HTMLInputElement;
      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(true);
      expect(confirmBtn.disabled).toBe(false);

      // 5. Submit return
      fireEvent.click(confirmBtn);

      // 6. Verify state updated on page
      await waitFor(() => {
        expect(screen.getByText(/Barang telah diserahkan kepada pemilik sah/i)).toBeDefined();
      });

      // 7. Verify atomic store state
      const item = await services.items.getItemById('item-uuid-001');
      expect(item?.status).toBe('RETURNED_TO_OWNER');
      expect(item?.isVisible).toBe(false);

      // 8. Verify return record created
      expect(mockStore.getState().returns.length).toBe(1);
      expect(mockStore.getState().returns[0].recipient_name).toBe('Budi Santoso');
    });
  });

  describe('F/B.5.1 Penyaluran sebagai Aksi Terpisah', () => {
    it('distributes item without creating item_returns entity and marks status DISTRIBUTED', async () => {
      render(
        <MemoryRouter initialEntries={['/petugas/inventaris/item-uuid-001']}>
          <Routes>
            <Route path="/petugas/inventaris/:id" element={<OfficerItemDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Salurkan Barang/i })).toBeDefined();
      });

      // 1. Open Distribute Modal
      fireEvent.click(screen.getByRole('button', { name: /Salurkan Barang/i }));
      expect(screen.getByRole('heading', { name: /Penyaluran Barang Temuan/i })).toBeDefined();

      const confirmBtn = screen.getByRole('button', { name: /Konfirmasi Penyaluran/i }) as HTMLButtonElement;
      expect(confirmBtn.disabled).toBe(true);

      // 2. Fill distribution notes
      const notesInput = screen.getByPlaceholderText(/Tuliskan pihak penerima penyaluran/i);
      fireEvent.change(notesInput, { target: { value: 'Diserahkan ke DKM Masjid Baitul Ilmi untuk lelang amal' } });

      const checkbox = document.getElementById('distributeCheck') as HTMLInputElement;
      fireEvent.click(checkbox);
      expect(confirmBtn.disabled).toBe(false);

      // 3. Confirm
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(screen.getByText(/Barang telah disalurkan dan ditarik dari katalog/i)).toBeDefined();
      });

      const item = await services.items.getItemById('item-uuid-001');
      expect(item?.status).toBe('DISTRIBUTED');
      expect(item?.isVisible).toBe(false);

      // Verify no item_returns entity created for distribution
      expect(mockStore.getState().returns.length).toBe(0);
    });
  });

  describe('F/B.5.2 Cegah Duplikasi Proses Fisik', () => {
    it('prevents double return or transition on non-STORED items', async () => {
      // First return
      await services.items.returnItem('item-uuid-001', 'Ahmad', 'Verifikasi Kunci');

      // Attempt second return must fail
      await expect(
        services.items.returnItem('item-uuid-001', 'Budi', 'Coba duplikasi')
      ).rejects.toThrow(/tidak dalam status tersimpan/i);

      // Attempt distribution on returned item must fail
      await expect(
        services.items.distributeItem('item-uuid-001', 'Coba salurkan')
      ).rejects.toThrow(/tidak dalam status tersimpan/i);
    });
  });

  describe('F/B.5.3 Uji Petugas End-to-End In-Memory', () => {
    it('executes full officer lifecycle: register -> inventory -> visibility -> receive student report -> return', async () => {
      // 1. Direct registration by Officer
      const created = await services.items.createItem({
        name: 'Headphone Sony Hitam',
        category: 'Elektronik',
        description: 'Headphone Sony over-ear hitam di perpustakaan',
        photoToken: 'mock-photo-token',
      });
      expect(created.status).toBe('STORED');
      expect(created.isVisible).toBe(true);

      // 2. Toggle visibility off and on
      const toggledOff = await services.items.updateVisibility(created.id, false);
      expect(toggledOff.isVisible).toBe(false);
      const toggledOn = await services.items.updateVisibility(created.id, true);
      expect(toggledOn.isVisible).toBe(true);

      // 3. Receive student report
      const received = await services.submissions.receiveSubmission('sub-uuid-001', {
        publicDescription: 'Jaket Hoodie Hitam Uniqlo terverifikasi',
        photoToken: 'mock-report-token',
      });
      expect(received.status).toBe('STORED');

      const sub = await services.submissions.getSubmissionById('sub-uuid-001');
      expect(sub?.status).toBe('RECEIVED');

      // Verify inventory has received item
      const inventory = await services.items.getOfficerItems();
      const hoodie = inventory.items.find((i) => i.name === 'Jaket Hoodie Hitam Uniqlo');
      expect(hoodie).toBeDefined();
      expect(hoodie?.status).toBe('STORED');

      // 4. Return registered item to owner
      if (hoodie) {
        const returned = await services.items.returnItem(
          hoodie.id,
          'Mahasiswa Pemilik',
          'Nomor telepon dan nota pembelian Uniqlo cocok'
        );
        expect(returned.status).toBe('RETURNED_TO_OWNER');
        expect(returned.isVisible).toBe(false);
      }

      // 5. Distribute first created item
      const distributed = await services.items.distributeItem(
        created.id,
        'Disalurkan ke lab audio multimedia'
      );
      expect(distributed.status).toBe('DISTRIBUTED');
      expect(distributed.isVisible).toBe(false);
    });
  });
});
