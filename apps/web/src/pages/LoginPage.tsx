import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, GraduationCap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { RoutePaths } from '@/constants/routes';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'student' | 'officer'>('officer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'officer') {
      navigate(RoutePaths.OFFICER_DASHBOARD);
    } else {
      navigate(RoutePaths.STUDENT_HOME);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8 flex flex-col gap-6">
      <div className="text-center flex flex-col items-center">
        <img
          src="/assets/branding/Logo_LostnFound.png"
          alt="UBL LostnFound"
          className="w-12 h-12 object-contain mb-3"
        />
        <h1 className="text-xl font-bold text-[var(--lf-ink)]">Masuk ke UBL LostnFound</h1>
        <p className="text-xs text-[var(--lf-muted)] mt-1">
          Pilih portal login sesuai peran Anda di kampus
        </p>
      </div>

      {/* Role Switcher Tabs */}
      <div className="flex bg-[#F2F4F7] p-1 rounded-[14px]">
        <button
          type="button"
          onClick={() => setActiveTab('officer')}
          className={`flex-1 py-2 text-xs font-semibold rounded-[10px] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'officer'
              ? 'bg-white text-[var(--lf-action)] shadow-sm'
              : 'text-[var(--lf-muted)] hover:text-[var(--lf-ink)]'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Petugas Pos
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('student')}
          className={`flex-1 py-2 text-xs font-semibold rounded-[10px] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'student'
              ? 'bg-white text-[var(--lf-blue)] shadow-sm'
              : 'text-[var(--lf-muted)] hover:text-[var(--lf-ink)]'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5" />
          Mahasiswa
        </button>
      </div>

      <Card className="p-6">
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <Input
            label={activeTab === 'officer' ? 'Email Petugas' : 'Email Mahasiswa'}
            type="email"
            placeholder={
              activeTab === 'officer'
                ? 'petugas.pengajaran@budiluhur.ac.id'
                : 'nim@student.budiluhur.ac.id'
            }
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Kata Sandi"
            type="password"
            placeholder="Masukkan kata sandi"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="flex justify-end">
            <span className="text-xs text-[var(--lf-action)] font-medium cursor-pointer hover:underline">
              Lupa kata sandi?
            </span>
          </div>
          <Button
            type="submit"
            variant="primary"
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="w-full mt-2"
          >
            {activeTab === 'officer' ? 'Masuk Panel Petugas' : 'Masuk Portal Mahasiswa'}
          </Button>
        </form>
      </Card>
    </div>
  );
};
