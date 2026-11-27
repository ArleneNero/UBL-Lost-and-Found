import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { registry } from '@/services/registry';
import { mockStore } from '@/data/mockStore';
import { StudentIdentityCard } from '@/features/student/components/StudentIdentityCard';

describe('Milestone F/D — Modul Mahasiswa (Mock & UI Services)', () => {
  beforeEach(() => {
    mockStore.reset();
    registry.setMode('in-memory');
  });

  describe('F/D.1 & F/D.2: Autentikasi, Profil & Recovery Mahasiswa', () => {
    it('berhasil login sebagai mahasiswa dan menyimpan session', async () => {
      const auth = registry.getServices().auth;
      const user = await auth.loginAsStudent(
        '2411502194@student.budiluhur.ac.id',
        'Arlene Nero',
        '2411502194'
      );

      expect(user.role).toBe('STUDENT');
      expect(user.name).toBe('Arlene Nero');
      expect(user.studentNumber).toBe('2411502194');

      const current = await auth.getCurrentUser();
      expect(current?.role).toBe('STUDENT');
      expect(current?.email).toBe('2411502194@student.budiluhur.ac.id');
    });

    it('berhasil logout dan membersihkan session', async () => {
      const auth = registry.getServices().auth;
      await auth.loginAsStudent();
      await auth.logout();

      const current = await auth.getCurrentUser();
      expect(current).toBeNull();
    });
  });

  describe('F/D.3: Pelaporan Barang Ditemukan (Found Report)', () => {
    it('membuat laporan temuan baru dengan status awal PENDING_RECEIPT', async () => {
      const services = registry.getServices();
      const report = await services.submissions.createSubmission({
        targetPostId: 1,
        itemName: 'Kunci Motor Beat Hitam',
        category: 'Kunci',
        description: 'Gantungan karakter Stitch biru',
        foundLocation: 'Parkiran Motor Depan',
        foundDate: '2026-10-25',
        photoToken: 'mock-upload-token-001',
      });

      expect(report.id).toBeDefined();
      expect(report.reportCode).toMatch(/^REP-2026-\d{4}$/);
      expect(report.itemName).toBe('Kunci Motor Beat Hitam');
      expect(report.status).toBe('PENDING_RECEIPT');
      expect(report.targetPostId).toBe(1);
    });
  });

  describe('F/D.4: Riwayat Laporan, Detail & Pembatalan Mandiri', () => {
    it('menampilkan daftar laporan dan dapat difilter berdasarkan status', async () => {
      const services = registry.getServices();
      
      // Initial mock has 1 submission
      const allReports = await services.submissions.getMySubmissions();
      expect(allReports.items.length).toBeGreaterThan(0);

      const pendingOnly = await services.submissions.getMySubmissions({
        status: 'PENDING_RECEIPT',
      });
      expect(pendingOnly.items.every((r) => r.status === 'PENDING_RECEIPT')).toBe(true);
    });

    it('mahasiswa dapat membatalkan laporan berstatus PENDING_RECEIPT dengan alasan wajib', async () => {
      const services = registry.getServices();
      const report = await services.submissions.createSubmission({
        targetPostId: 1,
        itemName: 'Buku Catatan Pemrograman',
        category: 'Lainnya',
        description: 'Buku tulis sidu sampul cokelat',
        foundLocation: 'Ruang 4.2.1',
        foundDate: '2026-10-25',
        photoToken: 'mock-token-002',
      });

      expect(report.status).toBe('PENDING_RECEIPT');

      // Batalkan dengan alasan wajib
      const cancelled = await services.submissions.cancelSubmission(
        report.id,
        'Pemilik langsung menemui saya di kelas dan barang sudah diserahkan'
      );

      expect(cancelled.status).toBe('CANCELLED');
      expect(cancelled.description).toContain('[DIBATALKAN PELAPOR]');

      // Verifikasi status tersimpan di store
      const fetched = await services.submissions.getSubmissionById(report.id);
      expect(fetched?.status).toBe('CANCELLED');
    });

    it('gagal membatalkan laporan jika status bukan PENDING_RECEIPT atau alasan kosong', async () => {
      const services = registry.getServices();
      const report = await services.submissions.createSubmission({
        targetPostId: 1,
        itemName: 'Tumbler Eiger',
        category: 'Aksesori',
        description: 'Warna hijau army',
        foundLocation: 'Kantin',
        foundDate: '2026-10-25',
        photoToken: 'mock-token-003',
      });

      // Alasan kosong harus ditolak
      await expect(
        services.submissions.cancelSubmission(report.id, '   ')
      ).rejects.toThrow('Alasan pembatalan wajib diisi');

      // Reject oleh petugas
      await services.submissions.rejectSubmission(report.id, 'Bukan barang kampus');

      // Laporan berstatus REJECTED tidak dapat dibatalkan lagi
      await expect(
        services.submissions.cancelSubmission(report.id, 'Ingin batalkan')
      ).rejects.toThrow('Laporan tidak dapat dibatalkan karena berstatus REJECTED');
    });
  });

  describe('F/D.5: Sinkronisasi Lintas Peran Mahasiswa-Petugas', () => {
    it('laporan yang disubmit mahasiswa langsung terbaca di antrean Petugas dan dapat diproses fisik', async () => {
      const services = registry.getServices();

      // 1. Mahasiswa submit laporan
      const created = await services.submissions.createSubmission({
        targetPostId: 1,
        itemName: 'Earphone Bluetooth Baseus',
        category: 'Elektronik',
        description: 'Casing putih oval',
        foundLocation: 'Tangga Gedung Unit 6',
        foundDate: '2026-10-26',
        photoToken: 'mock-token-004',
      });

      // 2. Petugas melihat laporan di pos pengajaran
      const officerQueue = await services.submissions.getOfficerSubmissions({
        targetPostId: 1,
        status: 'PENDING_RECEIPT',
      });
      const foundInQueue = officerQueue.items.find((s) => s.id === created.id);
      expect(foundInQueue).toBeDefined();

      // 3. Petugas menerima fisik barang di pos
      const receivedItem = await services.submissions.receiveSubmission(created.id, {
        publicDescription: 'Earphone Bluetooth Baseus putih (Fisik terverifikasi)',
        privateNotes: 'Ada nomor serial di bawah case',
        photoToken: 'mock-inv-photo-token',
      });

      expect(receivedItem.status).toBe('STORED');
      expect(receivedItem.inventoryCode).toMatch(/^INV-2026-\d{4}$/);

      // 4. Mahasiswa melihat status laporannya berubah menjadi RECEIVED
      const updatedStudentReport = await services.submissions.getSubmissionById(created.id);
      expect(updatedStudentReport?.status).toBe('RECEIVED');
    });
  });

  describe('StudentIdentityCard — Clean Profile Identity', () => {
    it('renders student name directly without initial badge and with single Mahasiswa Aktif pill', () => {
      render(
        <StudentIdentityCard
          profile={{
            id: 'stu-2',
            name: 'Budi Santoso',
            email: '2411508888@student.budiluhur.ac.id',
            role: 'STUDENT',
            studentNumber: '2411508888',
          }}
          onLogout={vi.fn()}
        />
      );

      expect(screen.getByText('Budi Santoso')).toBeDefined();
      expect(screen.getByText('Universitas Budi Luhur')).toBeDefined();
      expect(screen.queryByText(/Fakultas Teknologi Informasi/)).toBeNull();
      expect(screen.queryByText('Peran Sistem')).toBeNull();
      expect(screen.queryByText('B')).toBeNull();
      expect(screen.getByText('Mahasiswa Aktif')).toBeDefined();
      expect(screen.queryByText('Terverifikasi Kampus')).toBeNull();
      expect(screen.getByText('2411508888')).toBeDefined();
      expect(screen.getByText('2411508888@student.budiluhur.ac.id')).toBeDefined();
    });

    it('uses neutral dash fallback when profile is null instead of leaking another student name', () => {
      render(<StudentIdentityCard profile={null} onLogout={vi.fn()} />);

      expect(screen.queryByText(/Nero/)).toBeNull();
      expect(screen.queryByText('2411502194')).toBeNull();
      expect(screen.getAllByText('-').length).toBe(3);
    });
  });
});

