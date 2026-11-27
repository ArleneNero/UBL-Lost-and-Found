import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { OfficerRouteGuard } from '@/components/guards/OfficerRouteGuard';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { HttpAuthService } from '@/services/http/HttpAuthService';
import { InMemoryAuthService } from '@/services/in-memory/InMemoryAuthService';
import * as apiClientModule from '@/services/http/apiClient';
import { registry } from '@/services/registry';
import { mockStore } from '@/data/mockStore';

describe('Audit Fixes — Guards & Auth (FIND-12, FIND-13, FIND-22, FIND-30)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockStore.reset();
    registry.setMode('in-memory');
    apiClientModule.setAuthToken(null);
  });

  afterEach(() => {
    registry.setMode('in-memory');
    apiClientModule.setAuthToken(null);
  });

  describe('FIND-12: OfficerRouteGuard', () => {
    const renderGuardedRoute = () =>
      render(
        <MemoryRouter initialEntries={['/petugas/dashboard']}>
          <Routes>
            <Route path="/petugas/login" element={<div>Halaman Login Petugas</div>} />
            <Route path="/petugas" element={<OfficerRouteGuard />}>
              <Route path="dashboard" element={<div>Panel Rahasia Petugas</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

    it('shows loading state first and redirects unauthenticated users to /petugas/login without flashing officer UI', async () => {
      mockStore.getState().currentUser = null;
      let resolveAuth: ((val: null) => void) | undefined;
      vi.spyOn(registry.getServices().auth, 'getCurrentUser').mockImplementation(
        () => new Promise((resolve) => { resolveAuth = resolve; })
      );

      renderGuardedRoute();

      expect(screen.getByText(/Memverifikasi sesi petugas/i)).toBeDefined();
      expect(screen.queryByText('Panel Rahasia Petugas')).toBeNull();

      resolveAuth?.(null);

      await waitFor(() => {
        expect(screen.getByText('Halaman Login Petugas')).toBeDefined();
      });
      expect(screen.queryByText('Panel Rahasia Petugas')).toBeNull();
    });

    it('redirects STUDENT users to /petugas/login', async () => {
      await registry.getServices().auth.loginAsStudent(
        '2411502194@student.budiluhur.ac.id',
        'Mahasiswa Uji',
        '2411502194'
      );

      renderGuardedRoute();

      await waitFor(() => {
        expect(screen.getByText('Halaman Login Petugas')).toBeDefined();
      });
      expect(screen.queryByText('Panel Rahasia Petugas')).toBeNull();
    });

    it('allows authenticated OFFICER users into /petugas/*', async () => {
      await registry.getServices().auth.loginAsOfficer('petugas@budiluhur.ac.id', 'secret');

      renderGuardedRoute();

      await waitFor(() => {
        expect(screen.getByText('Panel Rahasia Petugas')).toBeDefined();
      });
    });

    it('redirects to /petugas/login when getCurrentUser rejects', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(registry.getServices().auth, 'getCurrentUser').mockRejectedValue(
        new Error('Network down')
      );

      renderGuardedRoute();

      await waitFor(() => {
        expect(screen.getByText('Halaman Login Petugas')).toBeDefined();
      });
    });
  });

  describe('FIND-13: LoginForm removes hardcoded demo credentials fallback', () => {
    it('blocks submission with clear validation message when email/NIM is empty', async () => {
      const loginSpy = vi.spyOn(registry.getServices().auth, 'loginAsStudent');

      render(
        <MemoryRouter>
          <LoginForm />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByRole('button', { name: /Masuk Sekarang/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert').textContent).toContain('Email kampus atau NIM wajib diisi');
      });
      expect(loginSpy).not.toHaveBeenCalled();
    });

    it('blocks submission when password is empty even if email is provided', async () => {
      const loginSpy = vi.spyOn(registry.getServices().auth, 'loginAsStudent');

      render(
        <MemoryRouter>
          <LoginForm />
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/Email Kampus \/ NIM/i), {
        target: { value: '2411509999' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Masuk Sekarang/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert').textContent).toContain('Kata sandi wajib diisi');
      });
      expect(loginSpy).not.toHaveBeenCalled();
    });

    it('submits resolved student email and exact password when both are filled', async () => {
      const loginSpy = vi.spyOn(registry.getServices().auth, 'loginAsStudent');

      render(
        <MemoryRouter>
          <LoginForm />
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/Email Kampus \/ NIM/i), {
        target: { value: '2411509999' },
      });
      fireEvent.change(screen.getByLabelText(/^Kata Sandi$/i), {
        target: { value: 'Rahasia123!' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Masuk Sekarang/i }));

      await waitFor(() => {
        expect(loginSpy).toHaveBeenCalledWith(
          '2411509999@student.budiluhur.ac.id',
          'Rahasia123!'
        );
      });
    });
  });

  describe('FIND-22: HttpAuthService.getCurrentUser token retention on transient errors', () => {
    it('clears auth token and returns null on 401/403/404 ApiError', async () => {
      const auth = new HttpAuthService();

      for (const status of [401, 403, 404]) {
        apiClientModule.setAuthToken('jwt-active-token');
        vi.spyOn(apiClientModule, 'apiClient').mockRejectedValueOnce(
          new apiClientModule.ApiError('AUTH_ERR', 'Unauthorized', status)
        );

        const result = await auth.getCurrentUser();
        expect(result).toBeNull();
        expect(apiClientModule.getAuthToken()).toBeNull();
      }
    });

    it('preserves auth token and rethrows on 5xx or network timeout errors', async () => {
      const auth = new HttpAuthService();

      apiClientModule.setAuthToken('jwt-keep-alive');
      vi.spyOn(apiClientModule, 'apiClient').mockRejectedValueOnce(
        new apiClientModule.ApiError('SERVER_ERROR', 'Service Unavailable', 503)
      );
      await expect(auth.getCurrentUser()).rejects.toThrow('Service Unavailable');
      expect(apiClientModule.getAuthToken()).toBe('jwt-keep-alive');

      vi.spyOn(apiClientModule, 'apiClient').mockRejectedValueOnce(
        new TypeError('Failed to fetch')
      );
      await expect(auth.getCurrentUser()).rejects.toThrow('Failed to fetch');
      expect(apiClientModule.getAuthToken()).toBe('jwt-keep-alive');
    });
  });

  describe('FIND-30: Password reset via IAuthService implementations', () => {
    it('HttpAuthService calls /auth/forgot-password and /auth/reset-password via apiClient', async () => {
      const auth = new HttpAuthService();
      const spy = vi.spyOn(apiClientModule, 'apiClient').mockResolvedValue({ data: { ok: true } });

      await auth.requestPasswordReset('  2411502194@STUDENT.BUDILUHUR.AC.ID  ');
      expect(spy).toHaveBeenCalledWith('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: '2411502194@student.budiluhur.ac.id' }),
      });

      await auth.resetPassword('tok-abc', 'NewPass123!');
      expect(spy).toHaveBeenCalledWith('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token: 'tok-abc', new_password: 'NewPass123!' }),
      });
    });

    it('InMemoryAuthService validates password reset inputs', async () => {
      const auth = new InMemoryAuthService();
      await expect(auth.requestPasswordReset('invalid@gmail.com')).rejects.toThrow(
        /@student\.budiluhur\.ac\.id/
      );
      await expect(auth.resetPassword('', 'Password123')).rejects.toThrow(/Token pemulihan/);
      await expect(auth.resetPassword('tok-1', 'short')).rejects.toThrow(/minimal 8 karakter/);
      await expect(
        auth.requestPasswordReset('2411502194@student.budiluhur.ac.id')
      ).resolves.toBeUndefined();
      await expect(auth.resetPassword('tok-1', 'Password123')).resolves.toBeUndefined();
    });
  });
});
