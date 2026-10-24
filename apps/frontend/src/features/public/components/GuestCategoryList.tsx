import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Laptop, Briefcase, Wallet, Key, CreditCard, LayoutGrid } from 'lucide-react';
import { RoutePaths } from '@/constants/routes';

const CATEGORIES = [
  { name: 'Elektronik', icon: Laptop, color: 'text-blue-600 bg-blue-50' },
  { name: 'Tas', icon: Briefcase, color: 'text-purple-600 bg-purple-50' },
  { name: 'Dompet', icon: Wallet, color: 'text-indigo-600 bg-indigo-50' },
  { name: 'Kunci', icon: Key, color: 'text-amber-600 bg-amber-50' },
  { name: 'KTM', icon: CreditCard, color: 'text-teal-600 bg-teal-50' },
  { name: 'Lainnya', icon: LayoutGrid, color: 'text-gray-600 bg-gray-50' },
];

export const GuestCategoryList: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-2xl border border-[var(--lf-border)] p-5 flex flex-col justify-between gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-[var(--lf-ink)]">Kategori</h2>
        <button
          onClick={() => navigate(RoutePaths.CATALOG)}
          className="text-xs font-semibold text-[var(--lf-action)] hover:underline cursor-pointer"
        >
          Lihat semua
        </button>
      </div>
      <div className="grid grid-cols-6 gap-2">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.name}
              onClick={() => navigate(`${RoutePaths.CATALOG}?cat=${encodeURIComponent(cat.name)}`)}
              className="flex flex-col items-center gap-1.5 p-1 rounded-xl hover:bg-[#F9FAFB] transition-colors cursor-pointer group"
            >
              <div className={`w-10 h-10 rounded-full ${cat.color} flex items-center justify-center transition-transform group-hover:scale-105`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-medium text-[var(--lf-ink)] truncate max-w-full">
                {cat.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
