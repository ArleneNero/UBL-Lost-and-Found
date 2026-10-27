import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Mail,
  Lock,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  AlertCircle,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { RoutePaths } from '@/constants/routes';
import { services } from '@/services/registry';

export const OfficerLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      // Zero-Trust Client: Client sends credentials to Backend, Backend validates with bcrypt
      await services.auth.loginAsOfficer(email, password);
      navigate(RoutePaths.OFFICER_DASHBOARD);
    } catch (err: any) {
      const msg =
        err?.message ||
        'Gagal masuk. Periksa kembali email dan kata sandi petugas Anda.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--lf-canvas)] flex flex-col justify-between">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-[var(--lf-border)] sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            to={RoutePaths.LANDING}
            className="flex items-center gap-3 group select-none"
          >
            <img
              src="/assets/branding/Logo_LostnFound.png"
              alt="UBL LostnFound"
              className="w-9 h-9 object-contain"
            />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-[var(--lf-ink)] leading-tight group-hover:text-[var(--lf-action)] transition-colors">
                UBL LostnFound
              </span>
              <span className="text-[11px] text-[var(--lf-muted)]">
                Layanan Barang Temuan Kampus
              </span>
            </div>
          </Link>

          <Link
            to={RoutePaths.LANDING}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#475467] hover:text-[#1570EF] transition-colors py-2 px-3 rounded-lg hover:bg-[#F2F4F7]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Beranda</span>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-md flex flex-col gap-6">
          {/* Header Card Info */}
          <div className="text-center flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-[#EFF8FF] border border-[#B2DDFF] flex items-center justify-center text-[#1570EF] shadow-xs mb-3.5">
              <ShieldCheck className="w-7 h-7 text-[#1570EF]" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFF8FF] border border-[#D1E9FF] text-[#175CD3] text-xs font-semibold mb-2">
              <Building2 className="w-3.5 h-3.5" />
              <span>Portal Khusus Petugas Pos</span>
            </div>
            <h1 className="text-2xl font-bold text-[var(--lf-ink)] tracking-tight">
              Masuk Panel Petugas
            </h1>
            <p className="text-xs sm:text-sm text-[var(--lf-muted)] mt-1.5 max-w-xs">
              Gunakan akun resmi petugas posko operasional Universitas Budi Luhur.
            </p>
          </div>

          {/* Form Card */}
          <Card className="p-6 sm:p-8 shadow-sm border border-[var(--lf-border)] bg-white rounded-2xl">
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
              <Input
                label="Email Petugas"
                type="email"
                id="officer-email"
                placeholder="petugas.pengajaran@budiluhur.ac.id"
                leftIcon={<Mail className="w-4 h-4" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                disabled={isLoading}
              />

              <Input
                label="Kata Sandi"
                type={showPassword ? 'text' : 'password'}
                id="officer-password"
                placeholder="Masukkan kata sandi petugas"
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="cursor-pointer text-[var(--lf-muted)] hover:text-[var(--lf-ink)] transition-colors focus:outline-none"
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={isLoading}
              />

              <div className="flex justify-end text-xs pt-1">
                <span
                  title="Hubungi Administrator Pengajaran"
                  className="text-[var(--lf-action)] font-medium cursor-pointer hover:underline"
                >
                  Lupa kata sandi?
                </span>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="w-full mt-2"
              >
                Masuk Panel Petugas
              </Button>
            </form>
          </Card>

          {/* Footer Notice */}
          <div className="text-center text-xs text-[var(--lf-muted)] px-4">
            <span>Bukan petugas jaga pos? </span>
            <Link
              to={RoutePaths.LANDING}
              className="text-[#1570EF] font-semibold hover:underline"
            >
              Kembali ke Halaman Utama
            </Link>
          </div>
        </div>
      </main>

      {/* Page Footer */}
      <footer className="bg-white border-t border-[var(--lf-border)] py-4 text-center text-xs text-[var(--lf-muted)]">
        <span>&copy; 2026 Universitas Budi Luhur — Sistem Manajemen Barang Temuan Terpadu</span>
      </footer>
    </div>
  );
};
