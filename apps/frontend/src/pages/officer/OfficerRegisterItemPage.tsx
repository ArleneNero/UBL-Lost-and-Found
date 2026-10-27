import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckSquare } from 'lucide-react';
import { RoutePaths } from '@/constants/routes';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useRegisterItem } from '@/features/officer/hooks/useRegisterItem';
import { ItemPhotoUploader, RegisterItemSuccess } from '@/features/officer/components';
import { RegisterItemSidebar } from '@/features/officer/components/RegisterItemSidebar';

const CATEGORIES = ['Elektronik', 'Dokumen', 'Kunci', 'Dompet', 'Tas', 'Pakaian', 'Aksesoris', 'Lainnya'];

export const OfficerRegisterItemPage: React.FC = () => {
  const navigate = useNavigate();
  const { formData, setFormData, previewUrl, handlePhotoSelect, handlePhotoRemove, errors, isSubmitting, createdItem, submit, resetForm } = useRegisterItem();

  if (createdItem) {
    return (
        <RegisterItemSuccess
          item={createdItem}
          onRecordAnother={resetForm}
          onViewInventory={() => navigate(RoutePaths.OFFICER_INVENTORY)}
        />
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submit();
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--lf-ink)]">Catat Barang</h1>
          <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--lf-soft)] text-[var(--lf-action)]">Petugas Pengajaran</span>
        </div>
        <p className="text-xs sm:text-sm text-[var(--lf-muted)] mt-1">Catat setelah barang diterima secara fisik di pos operasional.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={handleSubmit} className="lg:col-span-2 flex flex-col gap-5">
          <Card className="p-6 flex flex-col gap-4">
            <ItemPhotoUploader previewUrl={previewUrl} onPhotoSelect={handlePhotoSelect} onPhotoRemove={handlePhotoRemove} error={errors.photo} />

            <div>
              <label className="text-xs font-bold text-[var(--lf-ink)]">Nama barang *</label>
              <input type="text" placeholder="Contoh: AirPods Pro, Kunci Honda..." value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="mt-1 w-full px-3.5 py-2.5 text-sm bg-[var(--lf-canvas)] border border-[var(--lf-border)] rounded-[var(--lf-radius-md)] text-[var(--lf-ink)]" />
              {errors.name && <span className="text-xs text-[var(--lf-error)]">{errors.name}</span>}
            </div>

            <div>
              <label className="text-xs font-bold text-[var(--lf-ink)]">Kategori *</label>
              <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="mt-1 w-full px-3.5 py-2.5 text-sm bg-[var(--lf-canvas)] border border-[var(--lf-border)] rounded-[var(--lf-radius-md)] text-[var(--lf-ink)]">
                <option value="">Pilih kategori barang</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.category && <span className="text-xs text-[var(--lf-error)]">{errors.category}</span>}
            </div>

            <div>
              <label className="text-xs font-bold text-[var(--lf-ink)]">Deskripsi publik *</label>
              <textarea rows={3} placeholder="Deskripsi umum warna, bentuk fisik tanpa mengungkap ciri rahasia..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="mt-1 w-full px-3.5 py-2 text-sm bg-[var(--lf-canvas)] border border-[var(--lf-border)] rounded-[var(--lf-radius-md)] text-[var(--lf-ink)]" />
              {errors.description && <span className="text-xs text-[var(--lf-error)]">{errors.description}</span>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--lf-border)]">
              <div>
                <label className="text-xs font-bold text-[var(--lf-ink)]">Tanggal diterima</label>
                <input
                  type="date"
                  value={formData.receivedDate}
                  onChange={(e) => setFormData({ ...formData, receivedDate: e.target.value })}
                  className="mt-1 w-full px-3 py-2 text-xs bg-[var(--lf-canvas)] border border-[var(--lf-border)] rounded-[var(--lf-radius-md)] text-[var(--lf-ink)] cursor-pointer"
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[var(--lf-ink)]">Waktu diterima (WIB)</label>
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const hh = String(now.getHours()).padStart(2, '0');
                      const mm = String(now.getMinutes()).padStart(2, '0');
                      setFormData({ ...formData, receivedTime: `${hh}:${mm}` });
                    }}
                    className="text-[10px] font-semibold text-[var(--lf-action)] hover:underline cursor-pointer"
                  >
                    Waktu Sekarang
                  </button>
                </div>
                <input
                  type="time"
                  value={formData.receivedTime}
                  onChange={(e) => setFormData({ ...formData, receivedTime: e.target.value })}
                  className="mt-1 w-full px-3 py-2 text-xs bg-[var(--lf-canvas)] border border-[var(--lf-border)] rounded-[var(--lf-radius-md)] text-[var(--lf-ink)] cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-[var(--lf-border)]">
              <h3 className="text-xs font-bold text-[var(--lf-ink)]">Informasi tambahan (opsional)</h3>
              <input type="text" placeholder="Lokasi ditemukan (contoh: Area kampus, Kantin...)" value={formData.foundLocation} onChange={(e) => setFormData({ ...formData, foundLocation: e.target.value })} className="w-full px-3 py-2 text-xs bg-[var(--lf-canvas)] border border-[var(--lf-border)] rounded-[var(--lf-radius-md)] text-[var(--lf-ink)]" />
              <textarea rows={2} placeholder="Catatan ciri internal (tidak ditampilkan di katalog umum)..." value={formData.privateNotes} onChange={(e) => setFormData({ ...formData, privateNotes: e.target.value })} className="w-full px-3 py-2 text-xs bg-[var(--lf-canvas)] border border-[var(--lf-border)] rounded-[var(--lf-radius-md)] text-[var(--lf-ink)]" />
            </div>

            <div className="pt-2 border-t border-[var(--lf-border)] flex items-start gap-2.5">
              <input type="checkbox" id="physicallyReceived" checked={formData.isPhysicallyReceived} onChange={(e) => setFormData({ ...formData, isPhysicallyReceived: e.target.checked })} className="mt-0.5 h-4 w-4 rounded border-[var(--lf-border)] text-[var(--lf-action)]" />
              <label htmlFor="physicallyReceived" className="text-xs text-[var(--lf-ink)] cursor-pointer select-none">
                <span className="font-semibold block">Saya memastikan barang fisik sudah diterima dan berada di pos petugas.</span>
                <span className="text-[var(--lf-muted)]">Centang setelah barang fisik diperiksa.</span>
              </label>
            </div>
            {errors.isPhysicallyReceived && <span className="text-xs text-[var(--lf-error)]">{errors.isPhysicallyReceived}</span>}
            {errors.form && (
              <div className="p-3.5 rounded-xl bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] text-xs font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                <span className="leading-relaxed">{errors.form}</span>
                {(errors.form.toLowerCase().includes('token') ||
                  errors.form.toLowerCase().includes('autentikasi') ||
                  errors.form.toLowerCase().includes('kedaluwarsa')) && (
                  <button
                    type="button"
                    onClick={() => navigate(RoutePaths.OFFICER_LOGIN)}
                    className="px-3 py-1.5 bg-[#D92D20] text-white font-semibold rounded-lg hover:bg-[#B42318] transition-colors shrink-0 text-center cursor-pointer"
                  >
                    Masuk ke Akun Petugas
                  </button>
                )}
              </div>
            )}

            <Button type="submit" variant="primary" isLoading={isSubmitting} leftIcon={<CheckSquare className="w-4 h-4" />}>
              Konfirmasi & Simpan Barang
            </Button>
          </Card>
        </form>

        <RegisterItemSidebar />
      </div>
    </div>
  );
};
