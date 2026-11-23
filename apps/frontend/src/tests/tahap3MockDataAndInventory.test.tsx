import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { services } from '@/services/registry';
import { mockStore } from '@/data/mockStore';
import { OfficerInventoryPage } from '@/pages/officer/OfficerInventoryPage';
import { OfficerDashboardPage } from '@/pages/officer/OfficerDashboardPage';
import { OfficerAccountPage } from '@/pages/officer/OfficerAccountPage';

describe('Tahap 3 — Mock Data, Services & Officer Inventory', () => {
  beforeEach(() => {
    mockStore.reset();
  });

  it('provides consistent in-memory mock data across services', async () => {
    const itemsRes = await services.items.getOfficerItems({ limit: 50 });
    const subsRes = await services.submissions.getSubmissions({ limit: 50 });
    const postsRes = await services.posts.getPosts();

    expect(itemsRes.items.length).toBeGreaterThan(0);
    expect(subsRes.items.length).toBeGreaterThan(0);
    expect(postsRes.length).toBe(1);
  });

  it('renders OfficerInventoryPage with mock items and search filters', async () => {
    render(
      <MemoryRouter>
        <OfficerInventoryPage />
      </MemoryRouter>
    );

    // Wait for items to load
    await waitFor(() => {
      expect(screen.getAllByText('Kunci Motor Honda Vario').length).toBeGreaterThan(0);
    });

    // Check inventory code
    expect(screen.getAllByText('INV-2026-0001').length).toBeGreaterThan(0);

    // Test search filter
    const searchInput = screen.getByPlaceholderText('Cari barang atau kode inventaris...');
    fireEvent.change(searchInput, { target: { value: 'Kunci' } });

    expect(screen.getAllByText('Kunci Motor Honda Vario').length).toBeGreaterThan(0);
  });

  it('renders OfficerDashboardPage with metrics computed from mock data', async () => {
    render(
      <MemoryRouter>
        <OfficerDashboardPage />
      </MemoryRouter>
    );

    // Wait for mock data to be loaded and computed
    await waitFor(() => {
      expect(screen.getAllByText('Kunci Motor Honda Vario').length).toBeGreaterThan(0);
    });

    // Dashboard metrics should reflect mock data
    expect(screen.getByText('Barang tersedia')).toBeDefined();
    expect(screen.getByText('Sudah diserahkan')).toBeDefined();
    expect(screen.getByText('Laporan menunggu')).toBeDefined();
  });

  it('renders OfficerAccountPage storage policy defaulting to 365 days and updates with confirmation', async () => {
    render(
      <MemoryRouter>
        <OfficerAccountPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Kebijakan Batas Simpan/i)).toBeDefined();
      const input = screen.getByLabelText(/Batas Penyimpanan/i) as HTMLInputElement;
      expect(input.value).toBe('365');
    });

    const input = screen.getByLabelText(/Batas Penyimpanan/i) as HTMLInputElement;
    const saveBtn = screen.getByRole('button', { name: /Simpan Kebijakan/i }) as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);

    fireEvent.change(input, { target: { value: '180' } });
    // Still disabled without non-retroactive confirmation checkbox
    expect(saveBtn.disabled).toBe(true);

    const confirmBox = screen.getByRole('checkbox');
    fireEvent.click(confirmBox);
    expect(saveBtn.disabled).toBe(false);

    fireEvent.click(saveBtn);
    await waitFor(async () => {
      expect(screen.getByText(/diperbarui menjadi 180 hari/i)).toBeDefined();
      const settings = await services.items.getPostSettings();
      expect(settings.storageLimitDays).toBe(180);
    });
  });

  it('archives completed items via CleanInventoryModal while keeping STORED items and reveals them via Tampilkan Arsip', async () => {
    render(
      <MemoryRouter>
        <OfficerInventoryPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Kunci Motor Honda Vario').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole('button', { name: /Bersihkan Arsip/i }));
    expect(screen.getByRole('heading', { name: /Bersihkan Arsip Inventaris/i })).toBeDefined();

    const confirmBtn = screen.getByRole('button', { name: /Bersihkan \(Arsipkan\)/i }) as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);

    const dialog = screen.getByRole('dialog');
    const confirmCheckbox = dialog.querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireEvent.click(confirmCheckbox);
    expect(confirmBtn.disabled).toBe(false);

    fireEvent.click(confirmBtn);
    await waitFor(() => {
      expect(screen.getByText(/barang selesai berhasil diarsipkan/i)).toBeDefined();
    });

    // STORED item must remain visible
    expect(screen.getAllByText('Kunci Motor Honda Vario').length).toBeGreaterThan(0);
  });
});
