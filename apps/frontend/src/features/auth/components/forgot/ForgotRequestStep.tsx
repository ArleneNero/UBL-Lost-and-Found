import React from 'react';
import { Mail, ArrowRight } from 'lucide-react';

interface ForgotRequestStepProps {
  email: string;
  onEmailChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading?: boolean;
}

export const ForgotRequestStep: React.FC<ForgotRequestStepProps> = ({
  email,
  onEmailChange,
  onSubmit,
  isLoading = false,
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-[var(--lf-ink)] mb-1.5">
          Email Kampus
        </label>
        <div className="relative">
          <Mail className="w-4 h-4 text-[var(--lf-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="email"
            required
            disabled={isLoading}
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="nim@student.budiluhur.ac.id"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--lf-border)] text-base sm:text-sm text-[var(--lf-ink)] focus:outline-none focus:border-[var(--lf-action)] focus:ring-2 focus:ring-[var(--lf-soft)] transition-all"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-2.5 px-4 rounded-xl bg-[var(--lf-action)] text-white font-semibold text-xs sm:text-sm hover:bg-[#094bb0] active:scale-[0.99] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
      >
        <span>{isLoading ? 'Mengirim Tautan...' : 'Kirim Tautan Pemulihan'}</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </form>
  );
};

