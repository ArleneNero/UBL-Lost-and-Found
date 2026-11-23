import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { OfficerItemDetailPage } from '@/pages/officer/OfficerItemDetailPage';
import { InventoryReportPrintModal } from '@/features/officer/components/InventoryReportPrintModal';
import { InventoryReportSheetProps } from '@/features/officer/components/InventoryReportSheet';
import { services } from '@/services/registry';
import { HttpItemService } from '@/services/http/HttpItemService';
import { mockStore } from '@/data/mockStore';

describe('UAT-006 & BUG-004/005: Handover BAST, Report Details & Archive Service Contracts', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockStore.reset();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('processes return with optional NIM/ID Kampus, displays Ringkasan Serah Terima and printable HandoverReceiptSheet without leaking privateNotes', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

    render(
      <MemoryRouter initialEntries={['/petugas/inventaris/item-uuid-001']}>
        <Routes>
          <Route path="/petugas/inventaris/:id" element={<OfficerItemDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Serah Terima Pemilik/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Serah Terima Pemilik/i }));

    fireEvent.change(screen.getByLabelText(/Nama Lengkap Penerima/i), {
      target: { value: 'Andi Wijaya' },
    });
    fireEvent.change(screen.getByLabelText(/NIM \/ ID Kampus \(Opsional\)/i), {
      target: { value: '2111500123' },
    });
    fireEvent.change(screen.getByLabelText(/Ringkasan Verifikasi Kepemilikan/i), {
      target: { value: 'Menunjukkan STNK asli dan kunci cadangan Honda' },
    });
    fireEvent.click(document.getElementById('verifyCheck') as HTMLInputElement);
    fireEvent.click(screen.getByRole('button', { name: /Konfirmasi Serah Terima/i }));

    await waitFor(() => {
      expect(screen.getByText('Ringkasan Serah Terima')).toBeDefined();
    });

    // Ringkasan Serah Terima & HandoverReceiptSheet both contain recipient details
    expect(screen.getAllByText('Andi Wijaya').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/2111500123/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Menunjukkan STNK asli dan kunci cadangan Honda').length).toBeGreaterThanOrEqual(2);

    // BAST sheet content
    const bastArticle = screen.getByRole('article', {
      name: /Berita Acara Serah Terima Barang Temuan/i,
    });
    expect(bastArticle.textContent).toContain('BAST/INV-2026-0001');
    expect(bastArticle.textContent).toContain('Pihak Penerima');
    expect(bastArticle.textContent).toContain('Petugas Pos Pengajaran');
    // Private notes must never leak into BAST print sheet
    expect(bastArticle.textContent).not.toContain('Plat nomor B 3456 SAA');
    expect(bastArticle.textContent).not.toContain('[DISERAHKAN:');

    fireEvent.click(screen.getByRole('button', { name: /Cetak Berita Acara \(BAST\)/i }));
    expect(printSpy).toHaveBeenCalledTimes(1);
  });

  it('allows guest handover without NIM/ID Kampus and renders dash fallback', async () => {
    render(
      <MemoryRouter initialEntries={['/petugas/inventaris/item-uuid-002']}>
        <Routes>
          <Route path="/petugas/inventaris/:id" element={<OfficerItemDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Serah Terima Pemilik/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Serah Terima Pemilik/i }));
    fireEvent.change(screen.getByLabelText(/Nama Lengkap Penerima/i), {
      target: { value: 'Pengunjung Tamu' },
    });
    fireEvent.change(screen.getByLabelText(/Ringkasan Verifikasi Kepemilikan/i), {
      target: { value: 'Menyebutkan isi dompet dengan tepat' },
    });
    fireEvent.click(document.getElementById('verifyCheck') as HTMLInputElement);
    fireEvent.click(screen.getByRole('button', { name: /Konfirmasi Serah Terima/i }));

    await waitFor(() => {
      expect(screen.getByText('Ringkasan Serah Terima')).toBeDefined();
    });

    const item = await services.items.getItemById('item-uuid-002');
    expect(item?.returnRecord?.recipientIdentifier).toBeNull();
    expect(screen.getAllByText('Pengunjung Tamu').length).toBeGreaterThanOrEqual(2);
  });

  it('renders Detail Serah Terima column in InventoryReportPrintModal when toggle is active and strictly excludes privateNotes', async () => {
    const todayIso = new Date().toISOString();
    const onReportChange = vi.fn<(props: InventoryReportSheetProps | null) => void>();

    const fetchItems = vi.fn().mockResolvedValue([
      {
        id: 'ret-1',
        inventoryCode: 'INV-2026-0701',
        name: 'KTM & Dompet',
        category: 'Dompet',
        description: 'Dompet kulit hitam',
        foundLocation: 'Kantin Unit 3',
        foundDate: todayIso.slice(0, 10),
        receivedAt: todayIso,
        postId: 1,
        postName: 'Pos Pengajaran',
        photoUrl: '/photo.jpg',
        status: 'RETURNED_TO_OWNER' as const,
        isVisible: false,
        privateNotes: 'SECRET-PIN-DO-NOT-PRINT-8842',
        returnRecord: {
          returnId: 'r-1',
          recipientName: 'Siti Aminah',
          recipientIdentifier: '2211500456',
          verificationSummary: 'Cocok foto KTM & kartu ATM',
          returnedAt: todayIso,
          returnedByName: 'Petugas Pos Pengajaran',
        },
      },
      {
        id: 'sto-1',
        inventoryCode: 'INV-2026-0702',
        name: 'Payung Biru',
        category: 'Aksesori',
        description: 'Payung lipat biru',
        foundLocation: 'Lobby Unit 4',
        foundDate: todayIso.slice(0, 10),
        receivedAt: todayIso,
        postId: 1,
        postName: 'Pos Pengajaran',
        photoUrl: '/photo2.jpg',
        status: 'STORED' as const,
        isVisible: true,
        privateNotes: 'SECRET-STICKER-XYZ',
        returnRecord: null,
      },
    ]);

    render(
      <InventoryReportPrintModal
        isOpen={true}
        onClose={vi.fn()}
        fetchItems={fetchItems}
        onReportChange={onReportChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('KTM & Dompet')).toBeDefined();
    });

    // Initially Detail Serah Terima column is hidden
    expect(screen.queryByRole('columnheader', { name: /Detail Serah Terima/i })).toBeNull();

    // Toggle checkbox ON
    const toggle = screen.getByRole('checkbox', {
      name: /Sertakan Detail Penerima \(Serah Terima\)/i,
    }) as HTMLInputElement;
    expect(toggle.checked).toBe(false);
    fireEvent.click(toggle);
    expect(toggle.checked).toBe(true);

    expect(screen.getByRole('columnheader', { name: /Detail Serah Terima/i })).toBeDefined();
    expect(screen.getByText('Siti Aminah')).toBeDefined();
    expect(screen.getByText(/2211500456/)).toBeDefined();
    expect(screen.getByText(/Cocok foto KTM & kartu ATM/)).toBeDefined();

    // privateNotes must NEVER leak into report sheet
    expect(screen.queryByText(/SECRET-PIN-DO-NOT-PRINT-8842/)).toBeNull();
    expect(screen.queryByText(/SECRET-STICKER-XYZ/)).toBeNull();

    // Auto-activates when selecting RETURNED_TO_OWNER filter
    fireEvent.click(toggle); // turn off first
    expect(toggle.checked).toBe(false);
    fireEvent.change(screen.getByLabelText(/Filter Status/i), {
      target: { value: 'RETURNED_TO_OWNER' },
    });
    expect(toggle.checked).toBe(true);
    expect(screen.queryByText('Payung Biru')).toBeNull();
  });

  it('enforces InMemoryItemService archive error on 0 items and HttpItemService archived_only & recipient_identifier params', async () => {
    await expect(services.items.cleanCompletedInventory()).rejects.toThrow(
      /Tidak ada barang selesai/i
    );

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [],
          meta: { page: 1, limit: 100, total: 0, total_pages: 1 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const httpService = new HttpItemService();
    await httpService.getOfficerItems({ limit: 100, archivedOnly: true });
    expect(String(fetchSpy.mock.calls[0]?.[0])).toContain('archived_only=true');

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { ok: true } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            item_id: 'item-1',
            inventory_code: 'INV-2026-0001',
            item_name: 'Kunci',
            category: 'Kunci',
            public_description: 'Desc',
            found_location: null,
            found_on: null,
            received_at: '2026-10-24T10:00:00Z',
            post: { post_id: 1, name: 'Pos Pengajaran' },
            photos: [],
            status: 'RETURNED_TO_OWNER',
            is_visible: false,
            storage_post_id: 1,
            source_submission_id: null,
            private_verification_notes: null,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    await httpService.returnItem('item-1', 'Budi', 'Cocok', '2111500001');
    const postInit = fetchSpy.mock.calls[1]?.[1] as RequestInit;
    expect(JSON.parse(String(postInit.body))).toEqual({
      recipient_name: 'Budi',
      recipient_identifier: '2111500001',
      verification_summary: 'Cocok',
    });
  });
});
