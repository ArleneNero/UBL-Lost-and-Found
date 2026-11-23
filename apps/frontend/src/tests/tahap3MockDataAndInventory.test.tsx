import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
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

  it('shows empty state with activeUnarchivedCount and reset button when Hanya Arsip has 0 archived items', async () => {
    render(
      <MemoryRouter>
        <OfficerInventoryPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Kunci Motor Honda Vario').length).toBeGreaterThan(0);
    });

    const archiveCheckbox = screen.getByRole('checkbox', { name: /Hanya Arsip/i }) as HTMLInputElement;
    fireEvent.click(archiveCheckbox);

    await waitFor(() => {
      expect(screen.getAllByText(/Belum ada barang yang diarsipkan/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/12/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/barang aktif yang belum diarsipkan/i).length).toBeGreaterThan(0);
    });

    expect(screen.queryByText('Kunci Motor Honda Vario')).toBeNull();

    const backButtons = screen.getAllByRole('button', { name: /Kembali ke Inventaris Aktif/i });
    fireEvent.click(backButtons[0]);

    await waitFor(() => {
      expect(screen.getAllByText('Kunci Motor Honda Vario').length).toBeGreaterThan(0);
    });
    expect(archiveCheckbox.checked).toBe(false);
  });

  it('disables CleanInventoryModal confirmation and submit when 0 items are eligible (all and empty month)', async () => {
    render(
      <MemoryRouter>
        <OfficerInventoryPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Kunci Motor Honda Vario').length).toBeGreaterThan(0);
    });

    // Case 1: 0 completed items overall
    fireEvent.click(screen.getByRole('button', { name: /Bersihkan Arsip/i }));
    const dialog = screen.getByRole('dialog');
    const confirmCheckbox = dialog.querySelector('input[type="checkbox"]') as HTMLInputElement;
    const confirmBtn = screen.getByRole('button', { name: /Bersihkan \(Arsipkan\)/i }) as HTMLButtonElement;

    expect(confirmCheckbox.disabled).toBe(true);
    expect(confirmBtn.disabled).toBe(true);
    expect(screen.getByText(/Belum ada barang selesai/i)).toBeDefined();
    expect(screen.getAllByText(/STORED tetap aman/i).length).toBeGreaterThan(0);
    cleanup();

    // Case 2: Complete one item in 2026-10, check empty month 2025-01
    await services.items.returnItem('item-uuid-002', 'Rina Sari', 'Cek isi dompet', '2111500999');
    render(
      <MemoryRouter>
        <OfficerInventoryPage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getAllByText('Kunci Motor Honda Vario').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole('button', { name: /Bersihkan Arsip/i }));
    const monthRadio = screen.getByRole('radio', { name: /Bulan penerimaan tertentu/i });
    fireEvent.click(monthRadio);

    const monthInput = screen.getByLabelText(/Pilih bulan arsip/i) as HTMLInputElement;
    fireEvent.change(monthInput, { target: { value: '2025-01' } });

    await waitFor(() => {
      expect(screen.getByText(/Tidak ada barang selesai pada bulan 2025-01/i)).toBeDefined();
    });
    const monthModalCheckbox = screen.getByRole('dialog').querySelector('input[type="checkbox"]') as HTMLInputElement;
    const monthModalBtn = screen.getByRole('button', { name: /Bersihkan \(Arsipkan\)/i }) as HTMLButtonElement;
    expect(monthModalCheckbox.disabled).toBe(true);
    expect(monthModalBtn.disabled).toBe(true);
  });

  it('archives completed items via CleanInventoryModal while keeping STORED items and reveals only archived items with Diarsipkan badge via Hanya Arsip', async () => {
    await services.items.returnItem('item-uuid-002', 'Dewi Lestari', 'Verifikasi kartu member', '2111500123');

    render(
      <MemoryRouter>
        <OfficerInventoryPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Kunci Motor Honda Vario').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Dompet Cokelat').length).toBeGreaterThan(0);
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
      expect(screen.getByText(/1 barang selesai berhasil diarsipkan/i)).toBeDefined();
    });

    // STORED item remains visible; archived Dompet Cokelat hidden from active list
    expect(screen.getAllByText('Kunci Motor Honda Vario').length).toBeGreaterThan(0);
    expect(screen.queryByText('Dompet Cokelat')).toBeNull();

    // Enable Hanya Arsip -> shows only archived item with Diarsipkan badge
    const archiveCheckbox = screen.getByRole('checkbox', { name: /Hanya Arsip/i });
    fireEvent.click(archiveCheckbox);

    await waitFor(() => {
      expect(screen.getAllByText('Dompet Cokelat').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Diarsipkan').length).toBeGreaterThan(0);
    });
    expect(screen.queryByText('Kunci Motor Honda Vario')).toBeNull();
    expect(screen.getByRole('button', { name: /Lihat Inventaris Aktif/i })).toBeDefined();
  });

  it('opens multi-period Rekap & Cetak report modal from OfficerInventoryPage', async () => {
    render(
      <MemoryRouter>
        <OfficerInventoryPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Kunci Motor Honda Vario').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole('button', { name: /Rekap & Cetak/i }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Cetak Laporan Inventaris/i })).toBeDefined();
      expect(screen.getByRole('tab', { name: 'Tahunan' })).toBeDefined();
    });
  });
});
