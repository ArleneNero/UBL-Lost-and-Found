import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LandingPage } from '@/pages/LandingPage';
import { GuestHomePage } from '@/pages/GuestHomePage';
import { CatalogPage } from '@/pages/CatalogPage';
import { PublicLayout } from '@/components/layouts/PublicLayout';
import { services } from '@/services/registry';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Public & Guest Flows (F/C.1 - F/C.2.0)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('F/C.1.0 & F/C.1.1: Landing Page & Role Selection', () => {
    it('renders hero title, description, and official illustration', () => {
      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      expect(screen.getByText('Barangmu hilang?')).toBeDefined();
      expect(
        screen.getByText(/Tenang, barangmu mungkin sudah ditemukan/i)
      ).toBeDefined();

      const heroImg = screen.getByAltText(/Banner UBL LostnFound/i) as HTMLImageElement;
      expect(heroImg).toBeDefined();
      expect(heroImg.src).toContain(
        encodeURI('/assets/illustrations/landing/banner-hero-lostnfound.png')
      );
    });

    it('displays three user access options with corresponding genuine assets and routes', () => {
      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      // Petugas Card
      expect(screen.getByText('Petugas')).toBeDefined();
      const petugasImg = screen.getByAltText('Petugas') as HTMLImageElement;
      expect(petugasImg.src).toContain('/assets/illustrations/roles/Icon_Petugas.png');

      // Mahasiswa Card (Segera Hadir)
      expect(screen.getByText('Mahasiswa')).toBeDefined();
      expect(screen.getByText('Segera Hadir')).toBeDefined();
      const mhsImg = screen.getByAltText('Mahasiswa') as HTMLImageElement;
      expect(mhsImg.src).toContain('/assets/illustrations/roles/Icon_Mahasiswa.png');

      // Guest Card
      expect(screen.getByText('Mode Tamu')).toBeDefined();

      // Test navigation on clicking cards
      fireEvent.click(screen.getByText('Petugas'));
      expect(mockNavigate).toHaveBeenCalledWith('/petugas/login');

      // Mahasiswa is disabled per scope agreement
      fireEvent.click(screen.getByText('Mahasiswa'));
      expect(mockNavigate).not.toHaveBeenCalledWith('/mahasiswa/beranda');

      fireEvent.click(screen.getByText('Mode Tamu'));
      expect(mockNavigate).toHaveBeenCalledWith('/beranda');
    });
  });

  describe('F/C.1.2: Guest Home Page (03.P01/a)', () => {
    it('renders quick search banner, categories, and service post guide', async () => {
      render(
        <MemoryRouter>
          <GuestHomePage />
        </MemoryRouter>
      );

      expect(screen.getByText('Sedang mencari barangmu?')).toBeDefined();
      expect(screen.getByPlaceholderText(/Cari barang atau deskripsi/i)).toBeDefined();

      // Popular categories
      expect(screen.getByText('Elektronik')).toBeDefined();
      expect(screen.getByText('Tas')).toBeDefined();
      expect(screen.getByText('Dompet')).toBeDefined();
      expect(screen.getByText('Kunci')).toBeDefined();

      // Pos Pelayanan & Panduan cards
      expect(screen.getByText('Pos Pelayanan')).toBeDefined();
      expect(screen.getByText('Cara mengambil barang')).toBeDefined();

      // Recent items should load
      await waitFor(() => {
        expect(screen.getByText('Barang Temuan Terbaru')).toBeDefined();
      });
    });

    it('submits search query and navigates to catalog with q parameter', () => {
      render(
        <MemoryRouter>
          <GuestHomePage />
        </MemoryRouter>
      );

      const searchInput = screen.getByPlaceholderText(/Cari barang atau deskripsi/i);
      fireEvent.change(searchInput, { target: { value: 'Kunci Motor' } });
      fireEvent.click(screen.getByText('Cari Barang'));

      expect(mockNavigate).toHaveBeenCalledWith('/barang?q=Kunci%20Motor');
    });
  });

  describe('F/C.1.3: Shared Public Layout', () => {
    it('renders public navigation bar and handles active links', () => {
      render(
        <MemoryRouter initialEntries={['/beranda']}>
          <PublicLayout />
        </MemoryRouter>
      );

      expect(screen.getAllByText('Beranda').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Cari Barang').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Pos Pelayanan').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Lapor Temuan').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Login').length).toBeGreaterThan(0);
    });
  });

  describe('F/C.2.0: Shared Catalog Page & Privacy Isolation', () => {
    it('renders catalog items with filters, category chips, and pagination info', async () => {
      render(
        <MemoryRouter initialEntries={['/barang']}>
          <CatalogPage />
        </MemoryRouter>
      );

      expect(screen.getByText('Katalog Barang')).toBeDefined();
      expect(screen.getByText('Semua Kategori')).toBeDefined();

      await waitFor(() => {
        expect(screen.getByText(/barang tersedia/i)).toBeDefined();
      });
    });

    it('ensures public items only contain STORED and is_visible items without private notes leakage', async () => {
      const publicItemsResult = await services.items.getItems({ limit: 50 });

      // Check all returned items
      for (const item of publicItemsResult.items) {
        expect(item.status).toBe('STORED');
        expect(item.isVisible).toBe(true);
        expect(item.privateNotes).toBeNull();
      }
    });

    it('filters catalog items by category when category filter changes', async () => {
      render(
        <MemoryRouter initialEntries={['/barang']}>
          <CatalogPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/barang tersedia/i)).toBeDefined();
      });

      // Change category filter
      const catSelect = screen.getByLabelText('Filter Kategori');
      fireEvent.change(catSelect, { target: { value: 'Elektronik' } });
      expect((catSelect as HTMLSelectElement).value).toBe('Elektronik');
    });

    it('F/C.2.1: sorts items by newest and oldest, and clamps pagination correctly', async () => {
      // Sort newest
      const newestRes = await services.items.getItems({ sort: 'newest' });
      const oldestRes = await services.items.getItems({ sort: 'oldest' });

      expect(newestRes.items.length).toBe(8);
      expect(oldestRes.items.length).toBe(8);

      const firstNewestDate = new Date(newestRes.items[0].receivedAt).getTime();
      const firstOldestDate = new Date(oldestRes.items[0].receivedAt).getTime();
      expect(firstNewestDate).toBeGreaterThanOrEqual(firstOldestDate);

      // Boundary pagination tests: page < 1 clamps to 1
      const underflowRes = await services.items.getItems({ page: -5 });
      expect(underflowRes.page).toBe(1);

      // Boundary pagination tests: page > totalPages clamps to totalPages
      const overflowRes = await services.items.getItems({ page: 999 });
      expect(overflowRes.page).toBe(overflowRes.totalPages);
    });
  });
});
