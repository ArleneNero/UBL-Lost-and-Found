import React from 'react';
import { NavLink } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { clsx } from 'clsx';
import { UserSession } from '@/types/domain';
import { StudentNavItem } from './StudentMobileBottomNav';

interface StudentMobileMenuProps {
  isOpen: boolean;
  currentUser: UserSession | null;
  items: StudentNavItem[];
  isNavActive: (path: string) => boolean;
  onClose: () => void;
  onLogout: () => void;
}

export const StudentMobileMenu: React.FC<StudentMobileMenuProps> = ({
  isOpen,
  currentUser,
  items,
  isNavActive,
  onClose,
  onLogout,
}) => {
  if (!isOpen) return null;

  return (
    <div className="md:hidden border-t border-[var(--lf-border)] bg-white px-4 py-3 space-y-1">
      <div className="p-3 bg-[var(--lf-canvas)] rounded-xl mb-3 flex items-center justify-between">
        <div>
          <span className="block text-xs font-bold text-[var(--lf-ink)]">
            {currentUser?.name || '-'}
          </span>
          <span className="block text-[11px] text-[var(--lf-muted)]">
            NIM: {currentUser?.studentNumber || '-'}
          </span>
        </div>
        <button
          onClick={onLogout}
          className="text-xs font-semibold text-red-600 flex items-center gap-1 px-2.5 py-1 bg-red-50 rounded-lg"
        >
          <LogOut className="w-3.5 h-3.5" /> Keluar
        </button>
      </div>

      {items.map((item) => {
        const Icon = item.icon;
        const active = isNavActive(item.path);
        return (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors',
              active
                ? 'bg-[var(--lf-soft)] text-[var(--lf-action)]'
                : 'text-[var(--lf-muted)] hover:bg-[var(--lf-canvas)]'
            )}
          >
            <Icon className="w-4 h-4" />
            <span>{item.name}</span>
          </NavLink>
        );
      })}
    </div>
  );
};

