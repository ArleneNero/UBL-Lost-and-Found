import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Calendar, MapPin, Building2, AlertTriangle, CheckCircle2, Share2, UserCheck } from 'lucide-react';
import { RoutePaths } from '@/constants/routes';
import { Button } from '@/components/ui/Button';
import { Badge, BadgeVariant } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useOfficerItemDetail } from '@/features/officer/hooks/useOfficerItemDetail';
import { isItemOverdue } from '@/features/officer/selectors/inventorySelectors';
import { ItemVisibilityToggle, ReturnItemModal, DistributeItemModal } from '@/features/officer/components';

const statusMap: Record<string, { variant: BadgeVariant; label: string }> = {
  STORED: { variant: 'available', label: 'Tersedia di pos' },
  RETURNED_TO_OWNER: { variant: 'returned', label: 'Sudah diserahkan' },
  DISTRIBUTED: { variant: 'neutral', label: 'Disalurkan' },
};

export const OfficerItemDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { item, isLoading, error, isUpdating, isSubmitting, toggleVisibility, returnItem, distributeItem, refetch } = useOfficerItemDetail(id);
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [isDistributeOpen, setIsDistributeOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 max-w-4xl">
        <Skeleton height={36} width={180} />
        <Card className="p-6 space-y-4">
          <Skeleton height={200} className="w-full" />
          <Skeleton height={32} width="60%" />
          <Skeleton height={80} className="w-full" />
        </Card>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="py-8">
        <ErrorState title="Barang Tidak Ditemukan" description={error || 'Informasi inventaris barang tidak tersedia.'} onRetry={refetch} />
      </div>
    );
  }

  const overdue = item.status === 'STORED' && isItemOverdue(item.receivedAt);
  const cfg = statusMap[item.status] || statusMap.STORED;
  const dateStr = new Date(item.receivedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate(RoutePaths.OFFICER_INVENTORY)} className="w-fit -ml-2">
        Kembali ke inventaris
      </Button>

      {overdue && (
        <div className="flex items-start gap-3 p-4 bg-[var(--lf-warning-soft)] border border-[rgba(181,71,8,0.2)] rounded-[var(--lf-radius-md)] text-xs text-[var(--lf-ink)]">
          <AlertTriangle className="w-5 h-5 text-[var(--lf-warning)] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-[var(--lf-warning)]">Peringatan Penyimpanan Overdue:</span>
            <p className="mt-0.5 text-[var(--lf-muted)]">Barang telah tersimpan lebih dari batas pos (30 hari). Status tetap Tersedia di pos hingga tindakan petugas berikutnya.</p>
          </div>
        </div>
      )}

      <Card className="flex flex-col md:flex-row gap-6 p-6">
        <div className="w-full md:w-5/12 aspect-square rounded-[14px] overflow-hidden bg-[var(--lf-surface)] border border-[var(--lf-border)] shrink-0">
          <img src={item.photoUrl} alt={item.name} className="w-full h-full object-cover" />
        </div>

        <div className="flex-1 flex flex-col gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[var(--lf-soft)] text-[var(--lf-action)]">{item.category}</span>
              <Badge variant={cfg.variant}>{cfg.label}</Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--lf-ink)]">{item.name}</h1>
            <p className="text-xs text-[var(--lf-muted)] mt-1 font-mono">{item.inventoryCode} · {item.postName}</p>
          </div>

          <div className="space-y-2 pt-3 border-t border-[var(--lf-border)] text-xs">
            <h2 className="text-xs font-bold text-[var(--lf-ink)] uppercase tracking-wide">Deskripsi publik</h2>
            <p className="text-[var(--lf-muted)] leading-relaxed">{item.description || 'Tidak ada deskripsi publik.'}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-[var(--lf-muted)]">
              <div className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-[var(--lf-action)]" /> Diterima {dateStr}</div>
              <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-[var(--lf-action)]" /> Lokasi: {item.foundLocation || '-'}</div>
              <div className="flex items-center gap-1.5"><Building2 className="w-4 h-4 text-[var(--lf-action)]" /> Pos: {item.postName}</div>
            </div>
          </div>

          <div className="p-4 bg-[var(--lf-surface)] border border-[var(--lf-border)] rounded-[var(--lf-radius-md)] text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 text-[var(--lf-ink)] font-bold">
              <Lock className="w-3.5 h-3.5 text-[var(--lf-action)]" /> Hanya untuk petugas
            </div>
            <p className="text-[var(--lf-ink)] font-medium">{item.privateNotes || 'Tidak ada catatan ciri khusus.'}</p>
            <p className="text-[11px] text-[var(--lf-muted)]">Catatan ciri kepemilikan tersedia di sini. Tidak ditampilkan pada katalog publik.</p>
          </div>

          <ItemVisibilityToggle isVisible={item.isVisible} isUpdating={isUpdating} onToggle={toggleVisibility} />

          {item.status === 'STORED' ? (
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button variant="primary" className="flex-1" leftIcon={<UserCheck className="w-4 h-4" />} onClick={() => setIsReturnOpen(true)}>
                Serah Terima Pemilik
              </Button>
              <Button variant="secondary" className="flex-1" leftIcon={<Share2 className="w-4 h-4" />} onClick={() => setIsDistributeOpen(true)}>
                Salurkan Barang
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-[var(--lf-success-soft)] border border-[rgba(15,151,61,0.2)] rounded-[var(--lf-radius-md)] text-xs text-[var(--lf-success)] font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {item.status === 'RETURNED_TO_OWNER' ? 'Barang telah diserahkan kepada pemilik sah.' : 'Barang telah disalurkan dan ditarik dari katalog.'}
            </div>
          )}
        </div>
      </Card>

      <ReturnItemModal isOpen={isReturnOpen} onClose={() => setIsReturnOpen(false)} onConfirm={async (rec, sum) => { await returnItem(rec, sum); setIsReturnOpen(false); }} item={item} isSubmitting={isSubmitting} />
      <DistributeItemModal isOpen={isDistributeOpen} onClose={() => setIsDistributeOpen(false)} onConfirm={async (notes) => { await distributeItem(notes); setIsDistributeOpen(false); }} item={item} isSubmitting={isSubmitting} />
    </div>
  );
};
