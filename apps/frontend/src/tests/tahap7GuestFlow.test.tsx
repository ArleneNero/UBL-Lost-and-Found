import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { GuestHomePage } from '@/pages/GuestHomePage';
import { CatalogPage } from '@/pages/CatalogPage';
import { ItemDetailPage } from '@/pages/ItemDetailPage';
import { PostsPage } from '@/pages/PostsPage';
import { GuidePage } from '@/pages/GuidePage';
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

describe('Tahap 7 - Milestone F/C Guest Public Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.reset();
  });

  describe('F/C.1: Guest Home Page', () => {
    it('renders search hero, categories, and latest found items section', async () => {
      render(
        <MemoryRouter>
          <GuestHomePage />
        </MemoryRouter>
      );

      expect(screen.getByText('Sedang mencari barangmu?')).toBeDefined();
      expect(screen.getByText('Cara mengambil barang')).toBeDefined();
      expect(screen.getByPlaceholderText('Cari barang atau deskripsi...')).toBeDefined();
      expect(screen.getByText('Barang Temuan Terbaru')).toBeDefined();
      expect(screen.getByText('Kategori')).toBeDefined();
      expect(screen.getByText('Pos Pelayanan')).toBeDefined();
    });
  });

  describe('F/C.2: Public Catalog & Pagination', () => {
    it('renders catalog page with filter and search capabilities', async () => {
      render(
        <MemoryRouter>
          <CatalogPage />
        </MemoryRouter>
      );

      expect(screen.getByText('Katalog Barang')).toBeDefined();
      expect(screen.getByText(/Hanya barang yang sudah diterima petugas/i)).toBeDefined();
      expect(screen.getByPlaceholderText('Cari nama barang...')).toBeDefined();
      expect(screen.getByText('Semua Kategori')).toBeDefined();
    });
  });

  describe('F/C.3: Public Item Detail & 404 Not Found', () => {
    it('renders item details accurately with no private notes leakage', async () => {
      render(
        <MemoryRouter initialEntries={['/barang/item-uuid-003']}>
          <Routes>
            <Route path="/barang/:id" element={<ItemDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('AirPods Pro')).toBeDefined();
        expect(screen.getByText(/Earbuds putih beserta wadah pengisi daya/i)).toBeDefined();
        expect(screen.getAllByText(/Pengajaran/).length).toBeGreaterThan(0);
      });

      // Assert private notes are NEVER rendered
      expect(screen.queryByText(/Serial number tertera/i)).toBeNull();
    });

    it('renders 404 Not Found for non-existent item id', async () => {
      render(
        <MemoryRouter initialEntries={['/barang/item-non-existent-999']}>
          <Routes>
            <Route path="/barang/:id" element={<ItemDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Barang Tidak Ditemukan')).toBeDefined();
        expect(screen.getByText('Kembali ke Katalog')).toBeDefined();
      });
    });

    it('renders 404 when item is hidden by officer', async () => {
      // Toggle item visibility to false
      await services.items.updateVisibility('item-uuid-003', false);

      render(
        <MemoryRouter initialEntries={['/barang/item-uuid-003']}>
          <Routes>
            <Route path="/barang/:id" element={<ItemDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Barang Tidak Ditemukan')).toBeDefined();
      });
    });
  });

  describe('F/C.4: Posts and Guide Pages', () => {
    it('renders service posts list accurately for Pos Pengajaran', async () => {
      render(
        <MemoryRouter>
          <PostsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Pos Pelayanan')).toBeDefined();
        expect(screen.getByText('Pos Pengajaran')).toBeDefined();
        expect(screen.getByText(/Gedung Unit 4 Lantai 1, Ruang Pengajaran/i)).toBeDefined();
      });
    });

    it('renders 5-step physical pickup guide without online claim', () => {
      render(
        <MemoryRouter>
          <GuidePage />
        </MemoryRouter>
      );

      expect(screen.getByText('Alur Pengambilan')).toBeDefined();
      expect(screen.getByText('1. Cari barang')).toBeDefined();
      expect(screen.getByText('2. Periksa pos penyimpanan')).toBeDefined();
      expect(screen.getByText('3. Datang ke pos')).toBeDefined();
      expect(screen.getByText('4. Verifikasi kepemilikan')).toBeDefined();
      expect(screen.getByText('5. Barang diserahkan')).toBeDefined();
    });
  });
});
