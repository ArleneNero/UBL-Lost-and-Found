import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Home,
  Search,
  PlusCircle,
  ClipboardList,
  User,
  LogOut,
  GraduationCap,
  Menu,
  X,
} from 'lucide-react';
import { RoutePaths } from '@/constants/routes';
import { registry } from '@/services/registry';
import { UserSession } from '@/types/domain';
import { StudentNavItem, StudentMobileBottomNav } from './StudentMobileBottomNav';
import { StudentMobileMenu } from './StudentMobileMenu';

const studentNavItems: StudentNavItem[] = [
  { name: 'Beranda', path: RoutePaths.STUDENT_HOME, icon: Home },
  { name: 'Cari Barang', path: RoutePaths.CATALOG, icon: Search },
  { name: 'Lapor Temuan', path: RoutePaths.STUDENT_REPORT_FOUND, icon: PlusCircle },
  { name: 'Laporan Saya', path: RoutePaths.STUDENT_MY_REPORTS, icon: ClipboardList },
  { name: 'Profil', path: RoutePaths.STUDENT_PROFILE, icon: User },
];

export const StudentLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const user = await registry.getServices().auth.getCurrentUser();
      setCurrentUser(user);
    };
    fetchUser();
  }, [location.pathname]);

  const handleLogout = async () => {
    await registry.getServices().auth.logout();
    navigate(RoutePaths.LANDING);
  };

  const isNavActive = (path: string) => {
    if (path === RoutePaths.STUDENT_HOME) {
      return location.pathname === RoutePaths.STUDENT_HOME;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-[var(--lf-canvas)] flex flex-col">
      {/* Top Header Desktop & Mobile */}
      <header className="bg-white border-b border-[var(--lf-border)] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-[64px] flex items-center justify-between">
          <NavLink to={RoutePaths.STUDENT_HOME} className="flex items-center gap-3">
            <img src="/assets/branding/Logo_LostnFound.png" alt="UBL LostnFound" className="w-9 h-9 object-contain" />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-[var(--lf-ink)] leading-tight">UBL LostnFound</span>
              <span className="text-[11px] text-[var(--lf-action)] font-semibold flex items-center gap-1">
                <GraduationCap className="w-3 h-3" /> Portal Mahasiswa
              </span>
            </div>
          </NavLink>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {studentNavItems.map((item) => {
              const Icon = item.icon;
              const active = isNavActive(item.path);
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors',
                    active ? 'bg-[var(--lf-soft)] text-[var(--lf-action)]' : 'text-[var(--lf-muted)] hover:bg-[var(--lf-canvas)] hover:text-[var(--lf-ink)]'
                  )}
                >
                  <Icon className={clsx('w-4 h-4', active ? 'text-[var(--lf-action)]' : 'text-[var(--lf-muted)]')} />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* User Info & Logout (Desktop) */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2.5 px-3 py-1.5 bg-[var(--lf-canvas)] rounded-xl border border-[var(--lf-border)]">
              <div className="w-7 h-7 rounded-full bg-[var(--lf-soft)] text-[var(--lf-action)] font-bold text-xs flex items-center justify-center">
                {currentUser?.name?.charAt(0) || 'M'}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-[var(--lf-ink)] leading-tight max-w-[120px] truncate">{currentUser?.name || 'Mahasiswa'}</span>
                <span className="text-[10px] text-[var(--lf-muted)]">NIM: {currentUser?.studentNumber || '-'}</span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 rounded-xl border border-[var(--lf-border)] text-[var(--lf-muted)] hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors"
              title="Keluar"
              aria-label="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-[var(--lf-muted)] hover:bg-[var(--lf-canvas)]"
            aria-label="Buka menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <StudentMobileMenu
          isOpen={isMobileMenuOpen}
          currentUser={currentUser}
          items={studentNavItems}
          isNavActive={isNavActive}
          onClose={() => setIsMobileMenuOpen(false)}
          onLogout={handleLogout}
        />
      </header>

      <main className="flex-1 pb-16 md:pb-8">
        <Outlet />
      </main>

      <StudentMobileBottomNav items={studentNavItems} isNavActive={isNavActive} />
    </div>
  );
};
