import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ForgotPasswordForm } from '@/features/auth/components/ForgotPasswordForm';
import * as apiClientModule from '@/services/http/apiClient';

describe('ForgotPasswordForm — Token-Gated Reset Flow', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('transitions from REQUEST to SENT without dead-end button and supports changing email', async () => {
    const apiSpy = vi.spyOn(apiClientModule, 'apiClient').mockResolvedValue({ success: true });

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

    expect(apiSpy).toHaveBeenCalledWith(
      '/auth/forgot-password',
      expect.objectContaining({ method: 'POST' })
    );
    expect(screen.queryByText(/Buka Formulir Kata Sandi Baru/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Gunakan email lain/i }));
    expect(screen.getByPlaceholderText('nim@student.budiluhur.ac.id')).toBeDefined();
  });

  it('opens RESET only via URL token, toggles visibility, and resets password', async () => {
    const apiSpy = vi.spyOn(apiClientModule, 'apiClient').mockResolvedValue({ success: true });

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

    expect(apiSpy).toHaveBeenCalledWith(
      '/auth/reset-password',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ token: 'valid-jwt-123', new_password: 'PasswordBaru123' }),
      })
    );
  });

  it('shows recovery action back to REQUEST when reset token is invalid or expired', async () => {
    vi.spyOn(apiClientModule, 'apiClient').mockRejectedValue(
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
