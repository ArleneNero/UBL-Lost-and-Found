import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ForgotPasswordForm } from '@/features/auth/components/ForgotPasswordForm';
import { registry } from '@/services/registry';

describe('ForgotPasswordForm — Token-Gated Reset Flow (via IAuthService)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    registry.setMode('in-memory');
  });

  it('transitions from REQUEST to SENT without dead-end button and supports changing email', async () => {
    const authService = registry.getServices().auth;
    const reqSpy = vi.spyOn(authService, 'requestPasswordReset').mockResolvedValue();

    render(
      <MemoryRouter initialEntries={['/lupa-sandi']}>
        <ForgotPasswordForm />
      </MemoryRouter>
    );

    const emailInput = screen.getByPlaceholderText('nim@student.budiluhur.ac.id');
    fireEvent.change(emailInput, { target: { value: '2411502194@student.budiluhur.ac.id' } });
    fireEvent.click(screen.getByRole('button', { name: /Kirim Tautan Pemulihan/i }));

    await waitFor(() => {
      expect(screen.getByText('Periksa Kotak Masuk Email Anda')).toBeDefined();
    });

    expect(reqSpy).toHaveBeenCalledWith('2411502194@student.budiluhur.ac.id');
    expect(screen.queryByText(/Buka Formulir Kata Sandi Baru/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Gunakan email lain/i }));
    expect(screen.getByPlaceholderText('nim@student.budiluhur.ac.id')).toBeDefined();
  });

  it('opens RESET only via URL token, toggles visibility, and resets password', async () => {
    const authService = registry.getServices().auth;
    const resetSpy = vi.spyOn(authService, 'resetPassword').mockResolvedValue();

    render(
      <MemoryRouter initialEntries={['/lupa-sandi?token=valid-jwt-123&email=2411502194@student.budiluhur.ac.id']}>
        <ForgotPasswordForm />
      </MemoryRouter>
    );

    expect(screen.getByText('2411502194@student.budiluhur.ac.id')).toBeDefined();

    const newPwInput = screen.getByLabelText('Kata Sandi Baru') as HTMLInputElement;
    const confirmPwInput = screen.getByLabelText('Konfirmasi Kata Sandi Baru') as HTMLInputElement;

    expect(newPwInput.type).toBe('password');
    fireEvent.click(screen.getByRole('button', { name: /Tampilkan Kata Sandi Baru/i }));
    expect(newPwInput.type).toBe('text');

    fireEvent.change(newPwInput, { target: { value: 'PasswordBaru123' } });
    fireEvent.change(confirmPwInput, { target: { value: 'PasswordBaru123' } });
    fireEvent.click(screen.getByRole('button', { name: /Simpan Kata Sandi Baru/i }));

    await waitFor(() => {
      expect(screen.getByText('Kata Sandi Diperbarui')).toBeDefined();
    });

    expect(resetSpy).toHaveBeenCalledWith('valid-jwt-123', 'PasswordBaru123');
  });

  it('shows recovery action back to REQUEST when reset token is invalid or expired', async () => {
    const authService = registry.getServices().auth;
    vi.spyOn(authService, 'resetPassword').mockRejectedValue(
      new Error('Tautan pemulihan tidak valid atau sudah kedaluwarsa. Silakan ajukan ulang.')
    );

    render(
      <MemoryRouter initialEntries={['/lupa-sandi?token=expired-jwt&email=2411502194@student.budiluhur.ac.id']}>
        <ForgotPasswordForm />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText('Kata Sandi Baru'), { target: { value: 'PasswordBaru123' } });
    fireEvent.change(screen.getByLabelText('Konfirmasi Kata Sandi Baru'), { target: { value: 'PasswordBaru123' } });
    fireEvent.click(screen.getByRole('button', { name: /Simpan Kata Sandi Baru/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Ajukan Tautan Pemulihan Baru/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ajukan Tautan Pemulihan Baru/i }));
    expect(screen.getByPlaceholderText('nim@student.budiluhur.ac.id')).toBeDefined();
  });
});
