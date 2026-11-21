import React, { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';

interface ForgotResetStepProps {
  email?: string;
  newPassword: string;
  confirmPassword: string;
  onNewPasswordChange: (val: string) => void;
  onConfirmPasswordChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading?: boolean;
}

/** Formulir pembuatan kata sandi baru (hanya terbuka melalui tautan bertoken dari email). */
export const ForgotResetStep: React.FC<ForgotResetStepProps> = ({
  email,
  newPassword,
  confirmPassword,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
  isLoading = false,
}) => {
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const fields = [
    {
      id: 'new-password',
      label: 'Kata Sandi Baru',
      value: newPassword,
      onChange: onNewPasswordChange,
      placeholder: 'Minimal 8 karakter',
      show: showNew,
      onToggle: () => setShowNew((prev) => !prev),
    },
    {
      id: 'confirm-password',
      label: 'Konfirmasi Kata Sandi Baru',
      value: confirmPassword,
      onChange: onConfirmPasswordChange,
      placeholder: 'Ulangi kata sandi baru',
      show: showConfirm,
      onToggle: () => setShowConfirm((prev) => !prev),
    },
  ];

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {email && (
        <div className="px-3 py-2 rounded-xl bg-[#EFF8FF] border border-[#D1E9FF] flex items-center gap-2 text-xs text-[#175CD3]">
          <Mail className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate font-medium">{email}</span>
        </div>
      )}

      {fields.map((field) => (
        <div key={field.id}>
          <label htmlFor={field.id} className="block text-xs font-semibold text-[var(--lf-ink)] mb-1.5">
            {field.label}
          </label>
          <div className="relative flex items-center">
            <Lock className="w-4 h-4 text-[var(--lf-muted)] absolute left-3.5 pointer-events-none" />
            <input
              id={field.id}
              type={field.show ? 'text' : 'password'}
              required
              disabled={isLoading}
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
              placeholder={field.placeholder}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[var(--lf-border)] text-base sm:text-sm text-[var(--lf-ink)] focus:outline-none focus:border-[var(--lf-action)] focus:ring-2 focus:ring-[var(--lf-soft)] transition-all"
            />
            <button
              type="button"
              onClick={field.onToggle}
              aria-label={field.show ? `Sembunyikan ${field.label}` : `Tampilkan ${field.label}`}
              className="absolute right-3 text-[var(--lf-muted)] hover:text-[var(--lf-ink)] cursor-pointer p-1"
            >
              {field.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      ))}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-2.5 px-4 rounded-xl bg-[var(--lf-action)] text-white font-semibold text-xs sm:text-sm hover:bg-[#094bb0] active:scale-[0.99] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
      >
        <span>{isLoading ? 'Menyimpan Kata Sandi...' : 'Simpan Kata Sandi Baru'}</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </form>
  );
};
