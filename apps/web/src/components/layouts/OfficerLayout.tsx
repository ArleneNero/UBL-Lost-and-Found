import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  User,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { RoutePaths } from '@/constants/routes';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const officerNavItems: NavItem[] = [
  { name: 'Dashboard', path: RoutePaths.OFFICER_DASHBOARD, icon: LayoutDashboard },
  { name: 'Inventaris', path: RoutePaths.OFFICER_INVENTORY, icon: Package },
  { name: 'Laporan', path: RoutePaths.OFFICER_REPORTS, icon: ClipboardList },
  { name: 'Akun', path: RoutePaths.OFFICER_ACCOUNT, icon: User },
];

export const OfficerLayout: React.FC = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[var(--lf-canvas)] flex flex-col lg:flex-row">
      {/* Desktop Sidebar (244px) matching Figma Node 27:50 */}
      <aside className="hidden lg:flex flex-col w-[244px] bg-white border-r border-[var(--lf-border)] shrink-0 sticky top-0 h-screen">
        {/* Brand Header */}
        <div className="p-5 border-b border-[var(--lf-border)] flex items-center gap-3">
          <img
            src="/assets/branding/Logo_LostnFound.png"
            alt="UBL LostnFound"
            className="w-9 h-9 object-contain"
          />
          <div>
            <h1 className="text-sm font-bold text-[var(--lf-ink)] leading-tight">
              UBL LostnFound
            </h1>
            <span className="text-xs text-[var(--lf-muted)] font-medium">Panel Petugas</span>
          </div>
        </div>

        {/* Assigned Post Badge */}
        <div className="mx-4 my-3 p-3 bg-[var(--lf-soft)] rounded-[12px] border border-[rgba(11,94,215,0.15)] flex items-center gap-2.5">
          <Building2 className="w-4 h-4 text-[var(--lf-action)] shrink-0" />
          <div className="overflow-hidden">
            <span className="block text-xs text-[var(--lf-action)] font-bold truncate">
              Pos Pengajaran
            </span>
            <span className="block text-[11px] text-[var(--lf-muted)] truncate">
              Gedung Induk Lt. 1
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {officerNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={clsx(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-[12px] text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[var(--lf-soft)] text-[var(--lf-action)] font-semibold'
                    : 'text-[var(--lf-muted)] hover:bg-[#F9FAFB] hover:text-[var(--lf-ink)]'
                )}
              >
                <Icon className={clsx('w-5 h-5', isActive ? 'text-[var(--lf-action)]' : 'text-[var(--lf-muted)]')} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Officer Profile Footer */}
        <div className="p-4 border-t border-[var(--lf-border)] flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[var(--lf-soft)] flex items-center justify-center text-[var(--lf-action)] font-semibold text-xs shrink-0">
            <ShieldCheck className="w-5 h-5 text-[var(--lf-action)]" />
          </div>
          <div className="overflow-hidden">
            <span className="block text-xs font-semibold text-[var(--lf-ink)] truncate">Petugas Jaga</span>
            <span className="block text-[11px] text-[var(--lf-muted)] truncate">Aktif shift</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
        {/* Mobile Top Header */}
        <header className="lg:hidden bg-white border-b border-[var(--lf-border)] px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2.5">
            <img
              src="/assets/branding/Logo_LostnFound.png"
              alt="UBL LostnFound"
              className="w-8 h-8 object-contain"
            />
            <div>
              <span className="block text-xs font-bold text-[var(--lf-ink)]">UBL LostnFound</span>
              <span className="block text-[10px] text-[var(--lf-action)] font-semibold">Pos Pengajaran</span>
            </div>
          </div>
          <div className="w-7 h-7 rounded-full bg-[var(--lf-soft)] flex items-center justify-center text-[var(--lf-action)] text-xs font-bold">
            P
          </div>
        </header>

        {/* Page View Slot */}
        <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>

      {/* Mobile Fixed Bottom Navigation (Figma exact: Dashboard, Inventaris, Laporan, Akun) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--lf-border)] h-[64px] z-40 flex items-center justify-around px-2 shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
        {officerNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={clsx(
                'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors select-none',
                isActive ? 'text-[var(--lf-action)] font-semibold' : 'text-[var(--lf-muted)]'
              )}
            >
              <Icon className={clsx('w-5 h-5', isActive ? 'text-[var(--lf-action)]' : 'text-[var(--lf-muted)]')} />
              <span className="text-[11px] leading-none">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};
