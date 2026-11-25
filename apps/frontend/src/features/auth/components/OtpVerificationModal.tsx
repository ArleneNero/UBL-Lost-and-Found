import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle, RefreshCw, X, AlertCircle, ShieldCheck } from 'lucide-react';

export interface OtpVerificationModalProps {
  isOpen: boolean;
  email: string;
  extractedNim?: string;
  resendAvailableAt?: number;
  onClose: () => void;
  onVerifyOtp: (otp: string) => Promise<void>;
  onResendOtp?: () => Promise<void>;
}

const EMPTY_OTP = ['', '', '', '', '', ''];

function computeRemainingSeconds(resendAvailableAt?: number): number {
  if (typeof resendAvailableAt !== 'number') {
    return 60;
  }
  return Math.max(0, Math.ceil((resendAvailableAt - Date.now()) / 1000));
}

export const OtpVerificationModal: React.FC<OtpVerificationModalProps> = ({
  isOpen,
  email,
  extractedNim,
  resendAvailableAt,
  onClose,
  onVerifyOtp,
  onResendOtp,
}) => {
  const [otp, setOtp] = useState<string[]>(EMPTY_OTP);
  const [timer, setTimer] = useState(() => computeRemainingSeconds(resendAvailableAt));
  const [error, setError] = useState<string | null>(null);
  const [resentNotice, setResentNotice] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const isBusy = isVerifying || isResending;
  const canResend = timer <= 0;
  const isCountingDown = isOpen && timer > 0;

  // Reset form state when modal opens without wiping an active cooldown timestamp
  useEffect(() => {
    if (isOpen) {
      setOtp([...EMPTY_OTP]);
      setError(null);
      setResentNotice(null);
      setIsVerifying(false);
      setIsResending(false);
    }
  }, [isOpen]);

  // Sync remaining cooldown whenever modal opens or resendAvailableAt updates
  useEffect(() => {
    if (isOpen) {
      setTimer(computeRemainingSeconds(resendAvailableAt));
    }
  }, [isOpen, resendAvailableAt]);

  useEffect(() => {
    if (!isCountingDown) return;

    const interval = setInterval(() => {
      if (typeof resendAvailableAt === 'number') {
        setTimer(computeRemainingSeconds(resendAvailableAt));
      } else {
        setTimer((prev) => (prev <= 1 ? 0 : prev - 1));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isCountingDown, resendAvailableAt]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isBusy) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, isBusy, onClose]);

  if (!isOpen) return null;

  const fillDigits = (digits: string, startIndex: number) => {
    const cleanDigits = digits.replace(/\D/g, '').slice(0, 6);
    if (!cleanDigits) return;

    const nextOtp = [...otp];
    const effectiveStart = cleanDigits.length >= 6 ? 0 : startIndex;
    let lastFilledIndex = effectiveStart;

    for (let i = 0; i < cleanDigits.length && effectiveStart + i < 6; i++) {
      nextOtp[effectiveStart + i] = cleanDigits[i];
      lastFilledIndex = effectiveStart + i;
    }

    setOtp(nextOtp);
    setError(null);
    setResentNotice(null);

    const nextFocusIndex = Math.min(lastFilledIndex + 1, 5);
    document.getElementById(`otp-input-${nextFocusIndex}`)?.focus();
  };

  const handleOtpChange = (index: number, value: string) => {
    if (isBusy) return;
    if (!/^\d*$/.test(value)) return;

    if (value.length > 1) {
      if (value.length === 2 && otp[index]) {
        const existing = otp[index];
        const nextDigit = value.startsWith(existing)
          ? value.slice(1)
          : value.endsWith(existing)
            ? value.slice(0, 1)
            : value.slice(-1);
        const nextOtp = [...otp];
        nextOtp[index] = nextDigit;
        setOtp(nextOtp);
        setError(null);
        setResentNotice(null);
        if (index < 5) {
          document.getElementById(`otp-input-${index + 1}`)?.focus();
        }
        return;
      }

      fillDigits(value, index);
      return;
    }

    const nextOtp = [...otp];
    nextOtp[index] = value;
    setOtp(nextOtp);
    setError(null);
    setResentNotice(null);

    if (value && index < 5) {
      document.getElementById(`otp-input-${index + 1}`)?.focus();
    }
  };

  const handlePaste = (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    if (isBusy) return;
    const pastedText = e.clipboardData.getData('text');
    const digits = pastedText.replace(/\D/g, '');
    if (!digits) return;

    e.preventDefault();
    fillDigits(digits, index);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isBusy) return;
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-input-${index - 1}`)?.focus();
    }
  };

  const handleResend = async () => {
    if (!canResend || isBusy) return;
    setIsResending(true);
    setError(null);
    setResentNotice(null);

    try {
      if (onResendOtp) {
        await onResendOtp();
      }
      if (typeof resendAvailableAt !== 'number') {
        setTimer(60);
      }
      setOtp([...EMPTY_OTP]);
      setResentNotice('Kode OTP baru telah dikirim ke email kampus Anda.');
      document.getElementById('otp-input-0')?.focus();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim ulang kode OTP.');
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy) return;

    const code = otp.join('');
    if (code.length < 6) {
      setError('Masukkan 6 digit kode OTP lengkap.');
      return;
    }

    setIsVerifying(true);
    setError(null);
    setResentNotice(null);

    try {
      await onVerifyOtp(code);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verifikasi OTP gagal. Silakan coba lagi.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="otp-modal-title"
    >
      <div className="bg-[var(--lf-card)] w-full max-w-md rounded-[20px] shadow-[var(--shadow-modal)] border border-[var(--lf-border)] p-6 relative">
        <button
          type="button"
          onClick={() => {
            if (!isBusy) onClose();
          }}
          disabled={isBusy}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--lf-muted)] hover:bg-[var(--lf-canvas)] disabled:opacity-50 cursor-pointer"
          aria-label="Tutup modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-[var(--lf-soft)] flex items-center justify-center text-[var(--lf-action)] mb-3">
            <Mail className="w-6 h-6" />
          </div>
          <h3 id="otp-modal-title" className="text-lg font-bold text-[var(--lf-ink)]">
            Verifikasi Email Kampus
          </h3>
          <p className="text-xs text-[var(--lf-muted)] mt-1 max-w-xs leading-relaxed">
            Kode verifikasi 6 digit telah dikirimkan ke{' '}
            <span className="font-semibold text-[var(--lf-ink)]">{email}</span>.
          </p>
          {extractedNim && (
            <div className="inline-flex items-center gap-1.5 mt-2.5 px-3 py-1 rounded-full bg-[var(--lf-soft)] border border-[var(--lf-blue)]/20 text-xs font-medium text-[var(--lf-action)]">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>NIM Terkonfirmasi: {extractedNim}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex justify-center gap-2">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                id={`otp-input-${idx}`}
                type="text"
                inputMode="numeric"
                autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                aria-label={`Digit OTP ke-${idx + 1}`}
                maxLength={6}
                value={digit}
                onChange={(e) => handleOtpChange(idx, e.target.value)}
                onPaste={(e) => handlePaste(idx, e)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                disabled={isBusy}
                className="w-11 h-12 text-center text-lg font-bold rounded-[12px] border border-[var(--lf-border)] focus:border-[var(--lf-action)] focus:ring-2 focus:ring-[var(--lf-soft)] outline-none text-[var(--lf-ink)] transition-all disabled:opacity-60"
                autoFocus={idx === 0}
              />
            ))}
          </div>

          {error && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-[var(--lf-error-soft)] border border-[#FECDCA] text-[#B42318] text-xs font-medium flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[var(--lf-error)]" />
              <span className="flex-1 leading-relaxed">{error}</span>
            </div>
          )}

          {resentNotice && !error && (
            <div
              role="status"
              className="p-3 rounded-xl bg-[var(--lf-success-soft)] border border-[var(--lf-success)]/25 text-[var(--lf-success)] text-xs font-medium text-center"
            >
              {resentNotice}
            </div>
          )}

          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--lf-muted)]">Belum menerima kode?</span>
            {canResend ? (
              <button
                type="button"
                onClick={handleResend}
                disabled={isBusy}
                className="font-semibold text-[var(--lf-action)] hover:underline flex items-center gap-1 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                {isResending ? 'Mengirim Ulang...' : 'Kirim Ulang'}
              </button>
            ) : (
              <span className="text-[var(--lf-muted)] font-medium">
                Kirim ulang ({timer}s)
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isBusy}
            className="w-full py-2.5 px-4 rounded-[12px] bg-[var(--lf-action)] text-white font-semibold text-sm hover:bg-[#094bb0] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Memverifikasi...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Verifikasi & Masuk
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
