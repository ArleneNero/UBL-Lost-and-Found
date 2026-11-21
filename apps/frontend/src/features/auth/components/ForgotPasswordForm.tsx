import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { KeyRound, AlertCircle } from 'lucide-react';
import { RoutePaths } from '@/constants/routes';
import { apiClient } from '@/services/http/apiClient';
import { ForgotRequestStep } from './forgot/ForgotRequestStep';
import { ForgotSentStep } from './forgot/ForgotSentStep';
import { ForgotResetStep } from './forgot/ForgotResetStep';
import { ForgotSuccessStep } from './forgot/ForgotSuccessStep';

type ForgotStep = 'REQUEST' | 'SENT' | 'RESET' | 'SUCCESS';

export const ForgotPasswordForm: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token');
  const emailFromUrl = searchParams.get('email');

  const [step, setStep] = useState<ForgotStep>('REQUEST');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      if (emailFromUrl) setEmail(emailFromUrl);
      setStep('RESET');
    }
  }, [tokenFromUrl, emailFromUrl]);

  useEffect(() => {
    if (step !== 'SENT' || timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step, timer]);

  const handleResetToRequest = () => {
    setError(null);
    setToken('');
    setNewPassword('');
    setConfirmPassword('');
    setSearchParams({}, { replace: true });
    setStep('REQUEST');
  };

  const handleRequestReset = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@') || !cleanEmail.endsWith('@student.budiluhur.ac.id')) {
      setError('Masukkan alamat email resmi mahasiswa Budi Luhur (@student.budiluhur.ac.id).');
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      await apiClient('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: cleanEmail }),
      });
      setEmail(cleanEmail);
      setStep('SENT');
      setTimer(60);
      setCanResend(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim tautan pemulihan kata sandi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('Kata sandi baru minimal 8 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    const resetToken = token || tokenFromUrl;
    if (!resetToken) {
      setError('Token pemulihan tidak ditemukan atau tidak valid. Silakan ajukan tautan baru.');
      return;
    }

    setIsLoading(true);
    try {
      await apiClient('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token: resetToken, new_password: newPassword }),
      });
      setToken('');
      setSearchParams({}, { replace: true });
      setStep('SUCCESS');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal mengatur ulang kata sandi');
    } finally {
      setIsLoading(false);
    }
  };

  const isTokenError =
    step === 'RESET' &&
    Boolean(error && /(token|kedaluwarsa|tidak valid)/i.test(error));

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="text-center mb-1">
        <div className="w-12 h-12 rounded-full bg-[#EFF8FF] flex items-center justify-center text-[#1677FF] mx-auto mb-3">
          <KeyRound className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-[#111827]">
          {step === 'SUCCESS' ? 'Kata Sandi Diperbarui' : 'Pemulihan Akun Mahasiswa'}
        </h3>
        <p className="text-xs text-[#667085] mt-1">
          {step === 'REQUEST' && 'Masukkan email kampus untuk menerima tautan pemulihan'}
          {step === 'SENT' && 'Tautan pemulihan telah diproses ke email kampus Anda'}
          {step === 'RESET' && 'Buat kata sandi baru untuk akun mahasiswa Anda'}
          {step === 'SUCCESS' && 'Kata sandi Anda berhasil diubah. Silakan masuk kembali.'}
        </p>
      </div>

      {error && (
        <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-xl flex flex-col gap-2 text-xs text-red-700">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
          {isTokenError && (
            <button
              type="button"
              onClick={handleResetToRequest}
              className="self-start ml-6 font-semibold underline text-red-800 hover:text-red-950 cursor-pointer"
            >
              Ajukan Tautan Pemulihan Baru →
            </button>
          )}
        </div>
      )}

      {step === 'REQUEST' && (
        <ForgotRequestStep
          email={email}
          onEmailChange={setEmail}
          onSubmit={handleRequestReset}
          isLoading={isLoading}
        />
      )}

      {step === 'SENT' && (
        <ForgotSentStep
          email={email}
          timer={timer}
          canResend={canResend}
          isResending={isLoading}
          onResend={() => handleRequestReset()}
          onChangeEmail={handleResetToRequest}
        />
      )}

      {step === 'RESET' && (
        <ForgotResetStep
          email={email || emailFromUrl || undefined}
          newPassword={newPassword}
          confirmPassword={confirmPassword}
          onNewPasswordChange={setNewPassword}
          onConfirmPasswordChange={setConfirmPassword}
          onSubmit={handleResetSubmit}
          isLoading={isLoading}
        />
      )}

      {step === 'SUCCESS' && <ForgotSuccessStep />}

      {step !== 'SUCCESS' && (
        <div className="mt-2 pt-4 border-t border-[#E4E7EC] text-center">
          <Link to={RoutePaths.LOGIN} className="text-xs text-[#0B5ED7] font-semibold hover:underline">
            ← Kembali ke Halaman Masuk
          </Link>
        </div>
      )}
    </div>
  );
};
