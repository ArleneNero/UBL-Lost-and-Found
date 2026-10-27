import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OfficerLoginPage } from '@/pages/officer/OfficerLoginPage';
import { services } from '@/services/registry';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('OfficerLoginPage Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dedicated officer login form without student tabs', () => {
    render(
      <MemoryRouter>
        <OfficerLoginPage />
      </MemoryRouter>
    );

    // Header & Brand
    expect(screen.getAllByText('UBL LostnFound').length).toBeGreaterThan(0);
    expect(screen.getByText('Kembali ke Beranda')).toBeDefined();

    // Dedicated Officer Title & Badge
    expect(screen.getByText('Portal Khusus Petugas Pos')).toBeDefined();
    expect(
      screen.getByRole('heading', { name: /Masuk Panel Petugas/i })
    ).toBeDefined();
    expect(
      screen.getByText(/Gunakan akun resmi petugas posko operasional/)
    ).toBeDefined();

    // Inputs & Button
    expect(screen.getByLabelText(/Email Petugas/i)).toBeDefined();
    expect(screen.getByLabelText(/^Kata Sandi$/i)).toBeDefined();
    expect(
      screen.getByRole('button', { name: /Masuk Panel Petugas/i })
    ).toBeDefined();

    // Strictly ensure no student tabs or options exist
    expect(screen.queryByText('Mahasiswa')).toBeNull();
    expect(screen.queryByText('Email Mahasiswa')).toBeNull();
    expect(screen.queryByText('Masuk Portal Mahasiswa')).toBeNull();
  });

  it('submits credentials to auth service and navigates to officer dashboard on success', async () => {
    const loginSpy = vi
      .spyOn(services.auth, 'loginAsOfficer')
      .mockResolvedValueOnce({
        id: 'officer-test-id',
        name: 'Petugas Test',
        email: 'petugas.test@budiluhur.ac.id',
        role: 'OFFICER',
        assignedPostId: 1,
      });

    render(
      <MemoryRouter>
        <OfficerLoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Email Petugas/i), {
      target: { value: 'petugas.test@budiluhur.ac.id' },
    });
    fireEvent.change(screen.getByLabelText(/^Kata Sandi$/i), {
      target: { value: 'dummyTestPassword123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Masuk Panel Petugas/i }));

    await waitFor(() => {
      expect(loginSpy).toHaveBeenCalledWith(
        'petugas.test@budiluhur.ac.id',
        'dummyTestPassword123'
      );
      expect(mockNavigate).toHaveBeenCalledWith('/petugas/dashboard');
    });
  });

  it('displays error banner when authentication fails', async () => {
    vi.spyOn(services.auth, 'loginAsOfficer').mockRejectedValueOnce(
      new Error('Email atau kata sandi petugas tidak valid')
    );

    render(
      <MemoryRouter>
        <OfficerLoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Email Petugas/i), {
      target: { value: 'salah@budiluhur.ac.id' },
    });
    fireEvent.change(screen.getByLabelText(/^Kata Sandi$/i), {
      target: { value: 'sandiSalah' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Masuk Panel Petugas/i }));

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toBeDefined();
      expect(alert.textContent).toContain('Email atau kata sandi petugas tidak valid');
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
