import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { services } from '@/services/registry';
import { mockStore } from '@/data/mockStore';
import { OfficerInventoryPage } from '@/pages/officer/OfficerInventoryPage';
import { OfficerDashboardPage } from '@/pages/officer/OfficerDashboardPage';

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
    expect(screen.getByText('Laporan Menunggu')).toBeDefined();
  });
});
