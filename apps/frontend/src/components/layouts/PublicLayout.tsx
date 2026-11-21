import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Home,
  Search,
  PlusCircle,
  MapPin,
  ArrowRight,
  ArrowLeftRight,
  ClipboardList,
  LogOut,
  User,
} from 'lucide-react';
import { RoutePaths } from '@/constants/routes';
import { registry } from '@/services/registry';
import { UserSession } from '@/types/domain';
import { setGuestModeActive } from '@/utils/guestSession';
import { GuestReportNoticeModal } from '@/features/public/components/GuestReportNoticeModal';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  isActionModal?: boolean;
}

export const PublicLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [isNoticeOpen, setIsNoticeOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const isLanding = location.pathname === RoutePaths.LANDING;
  const isAuthRoute = [
    RoutePaths.LOGIN,
    RoutePaths.REGISTER,
    RoutePaths.FORGOT_PASSWORD,
    '/lupa-password',
    '/reset-password',
  ].some((p) => location.pathname.startsWith(p));

  useEffect(() => {
    let isMounted = true;
    registry
      .getServices()
      .auth.getCurrentUser()
      .then((user) => {
        if (isMounted) setCurrentUser(user);
      })
      .catch(() => {
        if (isMounted) setCurrentUser(null);
      });
    return () => {
      isMounted = false;
    };
  }, [location.pathname]);

  useEffect(() => {
    setIsAccountMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isAccountMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAccountMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAccountMenuOpen]);

  const handleLogout = async () => {
    setIsAccountMenuOpen(false);
    await registry.getServices().auth.logout();
    setGuestModeActive(false);
    setCurrentUser(null);
    navigate(`${RoutePaths.LANDING}?switch=true`);
  };

  const isStudent = currentUser?.role === 'STUDENT';
  const brandLink = isLanding
    ? RoutePaths.LANDING
    : currentUser?.role === 'OFFICER'
    ? RoutePaths.OFFICER_DASHBOARD
    : isStudent
    ? RoutePaths.STUDENT_HOME
    : RoutePaths.GUEST_HOME;

  const navItems: NavItem[] = isStudent
    ? [
        { name: 'Beranda', path: RoutePaths.GUEST_HOME, icon: Home },
        { name: 'Cari Barang', path: RoutePaths.CATALOG, icon: Search },
        { name: 'Lapor Temuan', path: RoutePaths.STUDENT_REPORT_FOUND, icon: PlusCircle },
        { name: 'Laporan Saya', path: RoutePaths.STUDENT_MY_REPORTS, icon: ClipboardList },
        { name: 'Pos Pelayanan', path: RoutePaths.POSTS, icon: MapPin },
      ]
    : [
        { name: 'Beranda', path: RoutePaths.GUEST_HOME, icon: Home },
        { name: 'Cari Barang', path: RoutePaths.CATALOG, icon: Search },
        { name: 'Lapor Temuan', path: '#lapor', icon: PlusCircle, isActionModal: true },
        { name: 'Pos Pelayanan', path: RoutePaths.POSTS, icon: MapPin },
      ];

  const mobileNavItems: NavItem[] = isStudent
    ? [
        { name: 'Beranda', path: RoutePaths.GUEST_HOME, icon: Home },
        { name: 'Cari', path: RoutePaths.CATALOG, icon: Search },
        { name: 'Lapor', path: RoutePaths.STUDENT_REPORT_FOUND, icon: PlusCircle },
        { name: 'Riwayat', path: RoutePaths.STUDENT_MY_REPORTS, icon: ClipboardList },
        { name: 'Pos', path: RoutePaths.POSTS, icon: MapPin },
      ]
    : [
        { name: 'Beranda', path: RoutePaths.GUEST_HOME, icon: Home },
        { name: 'Cari', path: RoutePaths.CATALOG, icon: Search },
        { name: 'Lapor', path: '#lapor', icon: PlusCircle, isActionModal: true },
        { name: 'Pos', path: RoutePaths.POSTS, icon: MapPin },
      ];

  const isNavActive = (itemPath: string) => {
    if (itemPath === RoutePaths.GUEST_HOME) {
      return (
        location.pathname === RoutePaths.GUEST_HOME ||
        location.pathname === RoutePaths.STUDENT_HOME
      );
    }
    if (itemPath.startsWith('/')) {
      return location.pathname.startsWith(itemPath);
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-[var(--lf-canvas)] flex flex-col">
      {/* Top Header (Unified Single Shell) */}
      <header className="bg-white border-b border-[var(--lf-border)] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-[64px] flex items-center justify-between gap-2">
          {/* Logo & Subtitle */}
          <NavLink to={brandLink} className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <img
              src="/assets/branding/Logo_LostnFound.png"
              alt="UBL LostnFound Logo"
              className="w-8 h-8 sm:w-9 sm:h-9 object-contain shrink-0"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-[var(--lf-ink)] leading-tight truncate">
                UBL LostnFound
              </span>
              <span className={clsx('text-[11px] text-[var(--lf-muted)] truncate', !isLanding && 'hidden sm:block')}>
                Temukan barangmu dengan mudah.
              </span>
            </div>
          </NavLink>

          {/* Desktop Navigation - Hidden on 00.01 Landing & Auth frames */}
          {!isLanding && !isAuthRoute && (
            <nav className="hidden md:flex items-center gap-6">
              {navItems.map((item) => {
                if (item.isActionModal) {
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => setIsNoticeOpen(true)}
                      className="text-sm transition-colors py-1 text-[#475467] font-medium hover:text-[#1570EF] cursor-pointer"
                    >
                      {item.name}
                    </button>
                  );
                }
                const active = isNavActive(item.path);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={clsx(
                      'text-sm transition-colors py-1',
                      active
                        ? 'text-[#1570EF] font-semibold'
                        : 'text-[#475467] font-medium hover:text-[#1570EF]'
                    )}
                  >
                    {item.name}
                  </NavLink>
                );
              })}
            </nav>
          )}

          {/* User Auth CTA / Profile Area - Hidden on Landing & Auth frames */}
          {!isLanding && !isAuthRoute && (
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {isStudent && currentUser ? (
                <div className="relative" ref={accountMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsAccountMenuOpen((prev) => !prev)}
                    aria-label="Menu akun mahasiswa"
                    aria-haspopup="menu"
                    aria-expanded={isAccountMenuOpen}
                    className={clsx(
                      'w-9 h-9 rounded-full flex items-center justify-center border transition-colors cursor-pointer',
                      isAccountMenuOpen
                        ? 'bg-[#EFF8FF] text-[#1570EF] border-[#B2DDFF] ring-2 ring-[#1570EF]/20'
                        : 'bg-[#F2F4F7] text-[var(--lf-ink)] border-[var(--lf-border)] hover:bg-[#E4E7EC]'
                    )}
                  >
                    <User className="w-4 h-4" />
                  </button>

                  {isAccountMenuOpen && (
                    <div
                      role="menu"
                      aria-label="Menu akun mahasiswa"
                      className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-[var(--lf-border)] shadow-lg py-2 z-50"
                    >
                      <div className="px-4 py-2.5 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#EFF8FF] text-[#1570EF] border border-[#B2DDFF] flex items-center justify-center shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[var(--lf-ink)] truncate">
                            {currentUser.name}
                          </p>
                          <p className="text-xs text-[var(--lf-muted)] truncate">
                            {currentUser.studentNumber || currentUser.email}
                          </p>
                        </div>
                      </div>

                      <div className="my-1 border-t border-[var(--lf-border)]" />

                      <div className="px-1.5">
                        <Link
                          to={RoutePaths.STUDENT_PROFILE}
                          role="menuitem"
                          onClick={() => setIsAccountMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-[var(--lf-ink)] hover:bg-[var(--lf-canvas)] transition-colors"
                        >
                          <User className="w-4 h-4 text-[var(--lf-muted)]" />
                          <span>Profil</span>
                        </Link>
                      </div>

                      <div className="my-1 border-t border-[var(--lf-border)]" />

                      <div className="px-1.5">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-[var(--lf-ink)] hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer text-left"
                        >
                          <LogOut className="w-4 h-4 text-[var(--lf-muted)]" />
                          <span>Keluar</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setGuestModeActive(false);
                      navigate(`${RoutePaths.LANDING}?switch=true`);
                    }}
                    title="Ganti Peran (Kembali ke Pilihan Peran)"
                    aria-label="Ganti Peran"
                    className="text-[var(--lf-muted)] hover:text-[#1570EF] hover:bg-blue-50/70 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">Ganti Peran</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGuestModeActive(false);
                      navigate(RoutePaths.LOGIN);
                    }}
                    className="bg-[#1570EF] hover:bg-[#175CD3] text-white px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <span>Masuk</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className={clsx('flex-1', isLanding || isAuthRoute ? 'pb-8' : 'pb-24 md:pb-8')}>
        <Outlet />
      </main>

      {/* Guest Notice Modal */}
      <GuestReportNoticeModal
        isOpen={isNoticeOpen}
        onClose={() => setIsNoticeOpen(false)}
      />

      {/* Mobile Bottom Navigation */}
      {!isLanding && !isAuthRoute && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--lf-border)] z-40 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
          <div className="h-[64px] w-full flex items-center justify-around px-1">
            {mobileNavItems.map((item) => {
              const Icon = item.icon;
              if (item.isActionModal) {
                return (
                  <button
                    key={`mobile-${item.name}`}
                    type="button"
                    onClick={() => setIsNoticeOpen(true)}
                    className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors select-none text-[var(--lf-muted)] hover:text-[#1570EF] cursor-pointer"
                  >
                    <Icon className="w-5 h-5 text-[var(--lf-muted)]" />
                    <span className="text-[10px] leading-none">{item.name}</span>
                  </button>
                );
              }
              const active = isNavActive(item.path);
              return (
                <NavLink
                  key={`mobile-${item.path}`}
                  to={item.path}
                  className={clsx(
                    'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors select-none',
                    active ? 'text-[#1570EF] font-semibold' : 'text-[var(--lf-muted)]'
                  )}
                >
                  <Icon className={clsx('w-5 h-5', active ? 'text-[#1570EF]' : 'text-[var(--lf-muted)]')} />
                  <span className="text-[10px] leading-none">{item.name}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      )}

      {/* Footer - Minimalist 1-line centered copyright on desktop user/guest pages */}
      {!isLanding && !isAuthRoute && (
        <footer className="hidden md:block bg-white border-t border-[var(--lf-border)] py-4 mt-auto">
          <div className="max-w-7xl mx-auto px-4 lg:px-8 text-center text-xs text-[var(--lf-muted)]">
            <span>&copy; 2026 Universitas Budi Luhur — Layanan Barang Temuan Terpadu</span>
          </div>
        </footer>
      )}
    </div>
  );
};
