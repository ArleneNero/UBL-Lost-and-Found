import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, ChevronUp } from 'lucide-react';
import { RoutePaths } from '@/constants/routes';

const SERVICE_POSTS = ['Pengajaran', 'Perpustakaan', 'Lab Komputer'];

interface GuestServicePostsProps {
  selectedPost: string;
  setSelectedPost: (post: string) => void;
}

export const GuestServicePosts: React.FC<GuestServicePostsProps> = ({
  selectedPost,
  setSelectedPost,
}) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-2xl border border-[var(--lf-border)] p-5 flex flex-col justify-between gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[var(--lf-action)]" />
          <h2 className="text-sm font-bold text-[var(--lf-ink)]">Pos Pelayanan</h2>
        </div>
        <ChevronUp className="w-4 h-4 text-[var(--lf-muted)]" />
      </div>
      <div className="flex items-center gap-2">
        {SERVICE_POSTS.map((pos) => (
          <button
            key={pos}
            onClick={() => {
              setSelectedPost(pos);
              navigate(RoutePaths.POSTS);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              selectedPost === pos
                ? 'bg-[#EFF8FF] text-[var(--lf-action)] border-[var(--lf-action)]'
                : 'bg-white text-[var(--lf-muted)] border-[var(--lf-border)] hover:bg-[#F9FAFB]'
            }`}
          >
            {pos}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-[var(--lf-muted)]">
        Lokasi dan jam pelayanan masing-masing pos
      </p>
    </div>
  );
};
