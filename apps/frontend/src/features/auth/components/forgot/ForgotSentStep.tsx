import React from 'react';
import { ArrowLeft, MailCheck, RefreshCw } from 'lucide-react';

interface ForgotSentStepProps {
  email: string;
  timer: number;
  canResend: boolean;
  isResending?: boolean;
  onResend: () => void;
  onChangeEmail: () => void;
}

/** Layar tunggu verifikasi tautan reset kata sandi dari kotak masuk email mahasiswa. */
export const ForgotSentStep: React.FC<ForgotSentStepProps> = ({
  email,
  timer,
  canResend,
  isResending = false,
  onResend,
  onChangeEmail,
}) => {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-[var(--lf-canvas)] rounded-xl border border-[var(--lf-border)] flex items-start gap-3 text-left">
        <div className="w-9 h-9 rounded-lg bg-[#EFF8FF] text-[#1570EF] flex items-center justify-center shrink-0 mt-0.5">
          <MailCheck className="w-4 h-4" />
        </div>
        <div className="space-y-1 min-w-0">
          <span className="text-xs font-semibold text-[var(--lf-ink)] block">
            Periksa Kotak Masuk Email Anda
          </span>
          <p className="text-xs text-[var(--lf-muted)] leading-relaxed break-words">
            Jika email <strong className="text-[var(--lf-ink)]">{email}</strong> terdaftar, tautan reset kata sandi telah dikirimkan dan berlaku selama <strong>30 menit</strong>. Periksa inbox atau folder spam, lalu klik tautan tersebut untuk membuat sandi baru.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs px-1">
        <span className="text-[var(--lf-muted)]">Belum menerima email?</span>
        {canResend ? (
          <button
            type="button"
            disabled={isResending}
            onClick={onResend}
            className="font-semibold text-[var(--lf-action)] hover:underline inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
            <span>{isResending ? 'Mengirim...' : 'Kirim Ulang'}</span>
          </button>
        ) : (
          <span className="text-[var(--lf-muted)]">Kirim ulang ({timer}s)</span>
        )}
      </div>

      <button
        type="button"
        onClick={onChangeEmail}
        className="w-full py-2.5 px-4 rounded-xl border border-[var(--lf-border)] bg-white text-[var(--lf-ink)] font-semibold text-xs hover:bg-slate-50 transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5 text-[var(--lf-muted)]" />
        <span>Salah alamat email? Gunakan email lain</span>
      </button>
    </div>
  );
};
