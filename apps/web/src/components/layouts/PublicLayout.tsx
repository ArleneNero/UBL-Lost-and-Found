import React from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { Home, Search, PlusCircle, MapPin, ArrowRight } from 'lucide-react';
import { RoutePaths } from '@/constants/routes';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const guestNavItems: NavItem[] = [
  { name: 'Beranda', path: RoutePaths.GUEST_HOME, icon: Home },
  { name: 'Cari Barang', path: RoutePaths.CATALOG, icon: Search },
  { name: 'Lapor Temuan', path: RoutePaths.STUDENT_REPORT_FOUND, icon: PlusCircle },
  { name: 'Pos Pelayanan', path: RoutePaths.POSTS, icon: MapPin },
];

export const PublicLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isLanding = location.pathname === RoutePaths.LANDING;

  const isNavActive = (itemPath: string) => {
    if (itemPath === RoutePaths.GUEST_HOME) {
      return location.pathname === RoutePaths.GUEST_HOME;
    }
    return location.pathname.startsWith(itemPath);
  };

  return (
    <div className="min-h-screen bg-[var(--lf-canvas)] flex flex-col">
      {/* Top Header (Figma 00.01 Landing vs 03.P01 Guest) */}
      <header className="bg-white border-b border-[var(--lf-border)] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-[64px] flex items-center justify-between">
          {/* Logo & Subtitle */}
          <NavLink to={RoutePaths.LANDING} className="flex items-center gap-3">
            <img
              src="/assets/branding/Logo_LostnFound.png"
              alt="UBL LostnFound Logo"
              className="w-9 h-9 object-contain"
            />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-[var(--lf-ink)] leading-tight">
                UBL LostnFound
              </span>
              <span className="text-[11px] text-[var(--lf-muted)]">
                Temukan barangmu dengan mudah.
              </span>
            </div>
          </NavLink>

          {/* Desktop Navigation - Hidden on 00.01 Landing Frame per Figma */}
          {!isLanding && (
            <nav className="hidden md:flex items-center gap-6">
              {guestNavItems.map((item) => {
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

          {/* Login CTA - Hidden on 00.01 Landing Frame per Figma */}
          {!isLanding && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(RoutePaths.LOGIN)}
                className="bg-[#1570EF] hover:bg-[#175CD3] text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <span>Login</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-8">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation - Only active in Guest subpages per Figma */}
      {!isLanding && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--lf-border)] h-[64px] z-40 flex items-center justify-around px-2 shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
          {guestNavItems.map((item) => {
            const Icon = item.icon;
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
        </nav>
      )}

      {/* Footer - Hidden on 00.01 Landing Frame per Figma */}
      {!isLanding && (
        <footer className="hidden md:block bg-white border-t border-[var(--lf-border)] py-6 mt-auto">
          <div className="max-w-7xl mx-auto px-4 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[var(--lf-muted)] gap-2">
            <span>&copy; 2026 Universitas Budi Luhur — Layanan Barang Temuan Terpadu</span>
            <span>Pos Layanan: Pengajaran, Perpustakaan, Lab Komputer</span>
          </div>
        </footer>
      )}
    </div>
  );
};
