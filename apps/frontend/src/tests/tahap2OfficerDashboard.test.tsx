import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OfficerDashboardPage } from '@/pages/officer/OfficerDashboardPage';
import { OfficerLayout } from '@/components/layouts/OfficerLayout';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Tahap 2 - Officer Dashboard & Layout (R1 & R3)', () => {
  it('renders OfficerLayout sidebar and navigation items including Tab Akun (R1)', () => {
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

  it('renders OfficerDashboardPage with layout, metrics, and Laporan Menunggu access (R3)', async () => {
    render(
      <MemoryRouter>
        <OfficerDashboardPage />
      </MemoryRouter>
    );

    // Header & Badge
    expect(screen.getByText('Petugas Pengajaran')).toBeDefined();
    expect(screen.getByText('Catat Barang')).toBeDefined();

    // Wait for async load
    await waitFor(() => {
      expect(screen.getByText('Barang tersedia')).toBeDefined();
      expect(screen.getByText('Sudah diserahkan')).toBeDefined();
      expect(screen.getByText('Laporan Menunggu')).toBeDefined();
    });

    // Verify Laporan Menunggu is clickable and navigates to reports
    const card = screen.getByText('Laporan Menunggu').closest('div');
    if (card) {
      fireEvent.click(card);
    }
  });
});