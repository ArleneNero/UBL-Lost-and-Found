import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  User,
  Lock,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RoutePaths } from '@/constants/routes';
import { registry } from '@/services/registry';
import { ApiError } from '@/services/http/apiClient';
import { validateAndExtractStudentNim } from '@/features/auth/utils/studentEmailNim';
import { OtpVerificationModal } from './OtpVerificationModal';

interface PendingRegistration {
  fullName: string;
  email: string;
  password: string;
  extractedNim: string;
}

const OTP_RESEND_COOLDOWN_MS = 60_000;

function resolveOtpErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError && err.status === 429) {
    return (
      err.message ||
      'Terlalu banyak permintaan kode OTP. Mohon tunggu beberapa saat sebelum mencoba lagi.'
    );
  }
  return err instanceof Error && err.message ? err.message : fallback;
}

export const RegisterForm: React.FC = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [challengeToken, setChallengeToken] = useState('');
  const [resendAvailableAt, setResendAvailableAt] = useState<number>(0);
  const [pendingRegistration, setPendingRegistration] = useState<PendingRegistration | null>(null);

  const emailValidation = validateAndExtractStudentNim(email);
  const showEmailFeedback = email.trim().length > 0 || emailTouched;
  const inlineEmailError =
    showEmailFeedback && !emailValidation.valid ? emailValidation.error : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailTouched(true);

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setError('Nama lengkap wajib diisi.');
      return;
    }
    if (trimmedName.length < 2) {
      setError('Nama lengkap minimal 2 karakter.');
      return;
    }
    if (trimmedName.length > 120) {
      setError('Nama lengkap maksimal 120 karakter.');
      return;
    }

    if (!emailValidation.valid) {
      return;
    }

    if (password.length < 8) {
      setError('Kata sandi minimal 8 karakter.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    const canReuseActiveChallenge =
      Boolean(challengeToken) &&
      pendingRegistration !== null &&
      pendingRegistration.fullName === trimmedName &&
      pendingRegistration.email === emailValidation.normalizedEmail &&
      pendingRegistration.password === password &&
      Date.now() < resendAvailableAt;

    if (canReuseActiveChallenge) {
      setOtpModalOpen(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const authService = registry.getServices().auth;
      const otpResult = await authService.requestStudentRegisterOtp({
        fullName: trimmedName,
        email: emailValidation.normalizedEmail,
        password,
      });

      setChallengeToken(otpResult.challengeToken);
      setResendAvailableAt(Date.now() + OTP_RESEND_COOLDOWN_MS);
      setPendingRegistration({
        fullName: trimmedName,
        email: emailValidation.normalizedEmail,
        password,
        extractedNim: otpResult.extractedNim || emailValidation.nim,
      });
      setOtpModalOpen(true);
    } catch (err: unknown) {
      setError(resolveOtpErrorMessage(err, 'Gagal mengirim kode OTP verifikasi email kampus.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (otp: string) => {
    if (!pendingRegistration || !challengeToken) {
      throw new Error('Sesi pendaftaran tidak ditemukan. Silakan kirim ulang kode OTP.');
    }

    const authService = registry.getServices().auth;
    await authService.registerStudent({
      fullName: pendingRegistration.fullName,
      email: pendingRegistration.email,
      password: pendingRegistration.password,
      otp,
      challengeToken,
    });

    setOtpModalOpen(false);
    navigate(RoutePaths.GUEST_HOME);
  };

  const handleResendOtp = async () => {
    if (!pendingRegistration) {
      throw new Error('Data pendaftaran tidak ditemukan. Silakan ulangi pengisian formulir.');
    }

    if (Date.now() < resendAvailableAt) {
      const remaining = Math.max(1, Math.ceil((resendAvailableAt - Date.now()) / 1000));
      throw new Error(`Mohon tunggu ${remaining} detik sebelum mengirim ulang kode OTP.`);
    }

    try {
      const authService = registry.getServices().auth;
      const otpResult = await authService.requestStudentRegisterOtp({
        fullName: pendingRegistration.fullName,
        email: pendingRegistration.email,
        password: pendingRegistration.password,
      });

      setChallengeToken(otpResult.challengeToken);
      setResendAvailableAt(Date.now() + OTP_RESEND_COOLDOWN_MS);
      setPendingRegistration((prev) =>
        prev
          ? {
              ...prev,
              extractedNim: otpResult.extractedNim || prev.extractedNim,
            }
          : prev
      );
    } catch (err: unknown) {
      throw new Error(resolveOtpErrorMessage(err, 'Gagal mengirim ulang kode OTP.'));
    }
  };

  return (
    <>
      <div className="w-full flex flex-col">
        {error && (
          <div
            role="alert"
            className="mb-5 p-3.5 rounded-xl bg-[var(--lf-error-soft)] border border-[#FECDCA] text-[#B42318] text-xs font-medium flex items-start gap-2.5 animate-in fade-in duration-200"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[var(--lf-error)]" />
            <div className="flex-1 leading-relaxed">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5" autoComplete="off" noValidate>
          {/* Nama Lengkap */}
          <Input
            label="Nama Lengkap"
            type="text"
            id="register-fullname"
            name="student_fullname"
            autoComplete="off"
            maxLength={120}
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Contoh: Arlene Nero"
            leftIcon={<User className="w-4 h-4" />}
          />

          {/* Email Kampus + Auto-NIM Extraction Preview */}
          <div className="flex flex-col gap-2">
            <Input
              label="Email Kampus"
              type="email"
              id="register-email"
              name="student_register_email"
              autoComplete="off"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
              placeholder="2411502194@student.budiluhur.ac.id"
              leftIcon={<Mail className="w-4 h-4" />}
              helperText={
                !showEmailFeedback
                  ? 'Wajib menggunakan email resmi mahasiswa berisi tepat 10 angka NIM (@student.budiluhur.ac.id)'
                  : undefined
              }
              aria-invalid={Boolean(inlineEmailError)}
              aria-describedby={inlineEmailError ? 'register-email-error' : undefined}
              className={
                inlineEmailError
                  ? 'border-[var(--lf-error)] text-[var(--lf-error)]'
                  : undefined
              }
            />

            {inlineEmailError && (
              <div
                id="register-email-error"
                role="alert"
                className="flex items-start gap-2 px-3 py-2 rounded-xl bg-[var(--lf-error-soft)] border border-[#FECDCA] text-xs text-[#B42318] font-medium"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[var(--lf-error)]" />
                <span className="leading-relaxed">{inlineEmailError}</span>
              </div>
            )}

            {emailValidation.valid && (
              <div
                role="status"
                aria-live="polite"
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--lf-success-soft)] border border-[var(--lf-success)]/25 text-xs text-[var(--lf-success)] font-medium"
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>NIM Terdeteksi Otomatis: {emailValidation.nim}</span>
              </div>
            )}
          </div>

          {/* Kata Sandi */}
          <Input
            label="Kata Sandi"
            type={showPassword ? 'text' : 'password'}
            id="register-password"
            name="new_password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimal 8 karakter"
            leftIcon={<Lock className="w-4 h-4" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="cursor-pointer text-[var(--lf-muted)] hover:text-[var(--lf-ink)] transition-colors focus:outline-none"
                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
          />

          {/* Konfirmasi Kata Sandi */}
          <Input
            label="Konfirmasi Kata Sandi"
            type={showConfirmPassword ? 'text' : 'password'}
            id="register-confirm-password"
            name="confirm_new_password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Ulangi kata sandi"
            leftIcon={<Lock className="w-4 h-4" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="cursor-pointer text-[var(--lf-muted)] hover:text-[var(--lf-ink)] transition-colors focus:outline-none"
                aria-label={showConfirmPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            }
          />

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isSubmitting}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="w-full mt-2"
          >
            {isSubmitting ? 'Mengirim Kode OTP...' : 'Daftar Akun Mahasiswa'}
          </Button>
        </form>
      </div>

      <OtpVerificationModal
        isOpen={otpModalOpen}
        email={pendingRegistration?.email || email.trim().toLowerCase()}
        extractedNim={pendingRegistration?.extractedNim}
        resendAvailableAt={resendAvailableAt}
        onClose={() => setOtpModalOpen(false)}
        onVerifyOtp={handleVerifyOtp}
        onResendOtp={handleResendOtp}
      />
    </>
  );
};
