import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RoutePaths } from '@/constants/routes';
import { registry } from '@/services/registry';

export const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const rawIdentifier = email.trim();
    if (!rawIdentifier) {
      setErrorMessage('Email kampus atau NIM wajib diisi.');
      return;
    }

    if (!password.trim()) {
      setErrorMessage('Kata sandi wajib diisi.');
      return;
    }

    let resolvedEmail: string;
    if (!rawIdentifier.includes('@') && /^\d+$/.test(rawIdentifier)) {
      resolvedEmail = `${rawIdentifier}@student.budiluhur.ac.id`;
    } else {
      const normalized = rawIdentifier.toLowerCase();
      if (!normalized.endsWith('@student.budiluhur.ac.id')) {
        setErrorMessage('Akun mahasiswa wajib menggunakan email resmi (@student.budiluhur.ac.id).');
        return;
      }
      resolvedEmail = normalized;
    }

    setIsLoading(true);
    try {
      const authService = registry.getServices().auth;
      await authService.loginAsStudent(resolvedEmail, password);
      navigate(RoutePaths.GUEST_HOME);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat masuk';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col">
      {errorMessage && (
        <div
          role="alert"
          className="mb-5 p-3.5 rounded-xl bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] text-xs font-medium flex items-start gap-2.5 animate-in fade-in duration-200"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#D92D20]" />
          <div className="flex-1 leading-relaxed">{errorMessage}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Email Kampus / NIM */}
        <Input
          label="Email Kampus / NIM"
          type="text"
          id="student-email"
          name="student_identifier"
          placeholder="nama@student.budiluhur.ac.id atau NIM"
          leftIcon={<Mail className="w-4 h-4" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="off"
          disabled={isLoading}
        />

        {/* Kata Sandi */}
        <Input
          label="Kata Sandi"
          type={showPassword ? 'text' : 'password'}
          id="student-password"
          name="student_password"
          placeholder="Masukkan kata sandi mahasiswa"
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
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          disabled={isLoading}
        />

        {/* Lupa Kata Sandi */}
        <div className="flex justify-end text-xs pt-0.5">
          <Link
            to={RoutePaths.FORGOT_PASSWORD}
            className="text-[var(--lf-action)] font-medium hover:underline"
          >
            Lupa Kata Sandi?
          </Link>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isLoading}
          rightIcon={<ArrowRight className="w-4 h-4" />}
          className="w-full mt-2"
        >
          Masuk Sekarang
        </Button>
      </form>
    </div>
  );
};
