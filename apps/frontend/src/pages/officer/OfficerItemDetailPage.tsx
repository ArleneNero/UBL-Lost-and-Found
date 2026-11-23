import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Calendar, MapPin, Building2, AlertCircle, AlertTriangle, CheckCircle2, Share2, UserCheck, Printer, X } from 'lucide-react';
import { RoutePaths } from '@/constants/routes';
import { Button } from '@/components/ui/Button';
import { Badge, BadgeVariant } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useOfficerItemDetail } from '@/features/officer/hooks/useOfficerItemDetail';
import {
  DEFAULT_STORAGE_LIMIT_DAYS,
  isItemOverdue,
} from '@/features/officer/selectors/inventorySelectors';
import {
  ItemVisibilityToggle,
  ReturnItemModal,
  DistributeItemModal,
  HandoverReceiptSheet,
} from '@/features/officer/components';
import { formatWibDateTime } from '@/features/officer/utils/wibDateFormatters';

const statusMap: Record<string, { variant: BadgeVariant; label: string }> = {
  STORED: { variant: 'available', label: 'Tersedia di pos' },
  RETURNED_TO_OWNER: { variant: 'returned', label: 'Sudah diserahkan' },
  DISTRIBUTED: { variant: 'neutral', label: 'Disalurkan' },
};

export const OfficerItemDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    item,
    isLoading,
    error,
    actionError,
    clearActionError,
    isUpdating,
    isSubmitting,
    toggleVisibility,
    returnItem,
    distributeItem,
    refetch,
  } = useOfficerItemDetail(id);
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

  const effectiveLimitDays = item.storageLimitDays ?? DEFAULT_STORAGE_LIMIT_DAYS;
  const overdue = item.status === 'STORED' && isItemOverdue(item);
  const cfg = statusMap[item.status] || statusMap.STORED;
  const dateStr = new Date(item.receivedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const shortPos = item.postName?.replace(/^Pos\s+/i, '') || 'Pengajaran';

  const handleBack = () => {
    const idx = window.history.state?.idx;
    if (typeof idx === 'number' && idx > 0) {
      navigate(-1);
    } else {
      navigate(RoutePaths.OFFICER_INVENTORY);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-6 max-w-4xl print:hidden">
        <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={handleBack} className="w-fit -ml-2">
          Kembali
        </Button>

      {actionError && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 p-4 bg-[var(--lf-error-soft)] border border-[rgba(217,45,32,0.2)] rounded-[var(--lf-radius-md)] text-xs text-[var(--lf-error)]"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={clearActionError}
            aria-label="Tutup pesan error"
            className="p-0.5 rounded hover:bg-black/5 shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {overdue && (
        <div className="flex items-start gap-3 p-4 bg-[var(--lf-warning-soft)] border border-[rgba(181,71,8,0.2)] rounded-[var(--lf-radius-md)] text-xs text-[var(--lf-ink)]">
          <AlertTriangle className="w-5 h-5 text-[var(--lf-warning)] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-[var(--lf-warning)]">Peringatan Penyimpanan Overdue:</span>
            <p className="mt-0.5 text-[var(--lf-muted)]">
              Barang telah tersimpan lebih dari batas pos ({effectiveLimitDays} hari). Status tetap Tersedia di pos hingga tindakan petugas berikutnya.
            </p>
          </div>
        </div>
      )}

      <Card className="flex flex-col md:flex-row gap-6 p-6">
        <div className="w-full md:w-5/12 aspect-square lg:aspect-[4/3] rounded-[14px] overflow-hidden bg-slate-100/80 border border-[var(--lf-border)] shrink-0 flex items-center justify-center p-3">
          <img src={item.photoUrl} alt={item.name} className="w-full h-full object-contain" />
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
              <div className="flex items-center gap-1.5"><Building2 className="w-4 h-4 text-[var(--lf-action)]" /> Pos: {shortPos}</div>
            </div>
          </div>

          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-[var(--lf-radius-md)] text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 text-amber-950 font-bold">
              <Lock className="w-3.5 h-3.5 text-amber-700" /> Hanya untuk petugas
            </div>
            <p className="text-amber-950 font-medium">{item.privateNotes || 'Tidak ada catatan ciri khusus.'}</p>
            <p className="text-[11px] text-amber-800/90">Catatan ciri kepemilikan tersedia di sini. Tidak ditampilkan pada katalog publik.</p>
          </div>

          {item.status === 'STORED' && (
            <ItemVisibilityToggle isVisible={item.isVisible} isUpdating={isUpdating} onToggle={toggleVisibility} />
          )}

          {item.status === 'STORED' ? (
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button variant="primary" className="flex-1" leftIcon={<UserCheck className="w-4 h-4" />} onClick={() => { clearActionError(); setIsReturnOpen(true); }}>
                Serah Terima Pemilik
              </Button>
              <Button variant="secondary" className="flex-1" leftIcon={<Share2 className="w-4 h-4" />} onClick={() => { clearActionError(); setIsDistributeOpen(true); }}>
                Salurkan Barang
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-[var(--lf-success-soft)] border border-[rgba(15,151,61,0.2)] rounded-[var(--lf-radius-md)] text-xs text-[var(--lf-success)] font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {item.status === 'RETURNED_TO_OWNER' ? 'Barang telah diserahkan kepada pemilik sah.' : 'Barang telah disalurkan dan ditarik dari katalog.'}
              </div>

              {item.status === 'RETURNED_TO_OWNER' && (
                <div className="p-4 bg-[var(--lf-surface)] border border-[var(--lf-border)] rounded-[var(--lf-radius-md)] space-y-3 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 className="text-xs font-bold text-[var(--lf-ink)] uppercase tracking-wide">
                      Ringkasan Serah Terima
                    </h3>
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<Printer className="w-4 h-4" />}
                      onClick={() => window.print()}
                    >
                      Cetak Berita Acara (BAST)
                    </Button>
                  </div>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-[var(--lf-ink)]">
                    <div>
                      <dt className="text-[11px] text-[var(--lf-muted)]">Nama Penerima</dt>
                      <dd className="font-semibold">{item.returnRecord?.recipientName || '-'}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-[var(--lf-muted)]">NIM / ID Kampus</dt>
                      <dd className="font-medium">{item.returnRecord?.recipientIdentifier || '-'}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-[var(--lf-muted)]">Waktu Serah Terima</dt>
                      <dd className="font-medium">
                        {item.returnRecord?.returnedAt ? formatWibDateTime(item.returnRecord.returnedAt) : '-'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-[var(--lf-muted)]">Petugas Penyerah</dt>
                      <dd className="font-medium">{item.returnRecord?.returnedByName || 'Petugas Pos Pengajaran'}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-[11px] text-[var(--lf-muted)]">Ringkasan Verifikasi</dt>
                      <dd className="font-medium leading-relaxed">{item.returnRecord?.verificationSummary || '-'}</dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      <ReturnItemModal
        isOpen={isReturnOpen}
        onClose={() => setIsReturnOpen(false)}
        onConfirm={async (rec, sum, recipientIdentifier) => {
          await returnItem(rec, sum, recipientIdentifier);
          setIsReturnOpen(false);
        }}
        item={item}
        isSubmitting={isSubmitting}
      />
      <DistributeItemModal
        isOpen={isDistributeOpen}
        onClose={() => setIsDistributeOpen(false)}
        onConfirm={async (notes) => {
          await distributeItem(notes);
          setIsDistributeOpen(false);
        }}
        item={item}
        isSubmitting={isSubmitting}
      />
      </div>

      {item.status === 'RETURNED_TO_OWNER' && (
        <div className="hidden print:block">
          <HandoverReceiptSheet item={item} />
        </div>
      )}
    </>
  );
};