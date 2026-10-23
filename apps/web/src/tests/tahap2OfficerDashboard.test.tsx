import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OfficerDashboardPage } from '@/pages/officer/OfficerDashboardPage';
import { OfficerLayout } from '@/components/layouts/OfficerLayout';

describe('Tahap 2 — Officer Dashboard & Layout', () => {
  it('renders OfficerLayout sidebar and navigation items', () => {
    render(
      <MemoryRouter initialEntries={['/petugas/dashboard']}>
        <OfficerLayout />
      </MemoryRouter>
    );

    expect(screen.getAllByText('Pos Pengajaran').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Inventaris').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Laporan').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Akun').length).toBeGreaterThan(0);
  });

  it('renders OfficerDashboardPage with honest empty state without database or API', () => {
    render(
      <MemoryRouter>
        <OfficerDashboardPage />
      </MemoryRouter>
    );

    // Header & Badge
    expect(screen.getByText('Petugas Pengajaran')).toBeDefined();
    // Metric cards
    expect(screen.getByText('Barang tersedia')).toBeDefined();
    expect(screen.getByText('Sudah diserahkan')).toBeDefined();
    expect(screen.getByText('Laporan Menunggu')).toBeDefined();
    // Zero stats (honest presentation)
    const zeroes = screen.getAllByText('0');
    expect(zeroes.length).toBeGreaterThanOrEqual(3);
    // Search and action button
    expect(screen.getByText('Catat Barang')).toBeDefined();
    // Empty state fallback for recent items
    expect(screen.getByText('Tidak ada barang inventaris yang ditemukan.')).toBeDefined();
  });
});
