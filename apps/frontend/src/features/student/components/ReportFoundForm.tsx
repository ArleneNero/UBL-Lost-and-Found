import React, { useState } from 'react';
import { Building2, Calendar, MapPin, PlusCircle, Sparkles } from 'lucide-react';
import { ITEM_CATEGORIES } from '@/constants/categories';
import { ACTIVE_SERVICE_POST } from '@/constants/locations';
import { toLocalDateKey } from '@/features/officer/selectors/reportDateSelectors';
import { ReportPhotoUploader } from './ReportPhotoUploader';

export interface ReportFoundFormValues {
  itemName: string;
  category: string;
  foundLocation: string;
  foundDate: string;
  description: string;
  photoFile: File | null;
  agreedToPhysicalDrop: boolean;
}

interface ReportFoundFormProps {
  isSubmitting: boolean;
  onSubmit: (values: ReportFoundFormValues) => Promise<void>;
  onCancel: () => void;
}

export const ReportFoundForm: React.FC<ReportFoundFormProps> = ({
  isSubmitting,
  onSubmit,
  onCancel,
}) => {
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('');
  const [foundLocation, setFoundLocation] = useState('');
  const [foundDate, setFoundDate] = useState(() => toLocalDateKey(new Date().toISOString()));
  const [description, setDescription] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [agreedToPhysicalDrop, setAgreedToPhysicalDrop] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      itemName,
      category,
      foundLocation,
      foundDate,
      description,
      photoFile,
      agreedToPhysicalDrop,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl sm:rounded-3xl border border-[#E4E7EC] p-6 sm:p-8 space-y-6 shadow-xs">
      {/* Target Pos Banner */}
      <div className="p-4 bg-[#EFF8FF] rounded-2xl border border-[#B2DDFF] flex items-start gap-3">
        <Building2 className="w-5 h-5 text-[#1570EF] shrink-0 mt-0.5" />
        <div className="text-xs">
          <span className="font-bold text-[#1570EF] block">
            Pos Tujuan: {ACTIVE_SERVICE_POST.name} ({ACTIVE_SERVICE_POST.locationShort})
          </span>
          <span className="text-[#475467] mt-0.5 block leading-relaxed">
            Fisik barang wajib diserahkan ke pos ini setelah formulir dikirimkan untuk dicocokkan dan dicatat ke inventaris resmi.
          </span>
        </div>
      </div>

      {/* Section 1: Informasi Barang */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-[#F2F4F7] pb-2">
          <Sparkles className="w-4 h-4 text-[#1570EF]" />
          <h3 className="text-sm font-bold text-[#111827]">
            Informasi Barang
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#111827] mb-1.5">
              Nama Barang Temuan <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Contoh: Kunci Motor Vario Merah / Dompet Cokelat"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E7EC] text-base sm:text-sm text-[#111827] placeholder-[#98A2B3] focus:outline-none focus:border-[#1570EF] focus:ring-2 focus:ring-[#EFF8FF] transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1.5">
              Kategori Barang <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E7EC] text-base sm:text-sm text-[#111827] focus:outline-none focus:border-[#1570EF] focus:ring-2 focus:ring-[#EFF8FF] transition-all bg-white"
            >
              <option value="">Pilih Kategori</option>
              {ITEM_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1.5">
              Tanggal Ditemukan <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-[#98A2B3] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                required
                value={foundDate}
                onChange={(e) => setFoundDate(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E4E7EC] text-base sm:text-sm text-[#111827] focus:outline-none focus:border-[#1570EF] focus:ring-2 focus:ring-[#EFF8FF] transition-all"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <ReportPhotoUploader selectedFile={photoFile} onPhotoSelected={setPhotoFile} />
            <p className="text-[11px] text-[#667085] mt-1.5">
              Foto akan dikompresi otomatis sebelum diunggah agar hemat kuota.
            </p>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#111827] mb-1.5">
              Deskripsi & Ciri-Ciri Barang <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan warna, merk, stiker, gantungan, atau ciri fisik lain yang memudahkan identifikasi pemilik..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E7EC] text-base sm:text-sm text-[#111827] placeholder-[#98A2B3] focus:outline-none focus:border-[#1570EF] focus:ring-2 focus:ring-[#EFF8FF] transition-all resize-none"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Informasi Penemuan */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-2 border-b border-[#F2F4F7] pb-2">
          <MapPin className="w-4 h-4 text-[#1570EF]" />
          <h3 className="text-sm font-bold text-[#111827]">
            Lokasi Penemuan
          </h3>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#111827] mb-1.5">
            Lokasi Tepat Penemuan <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-[#98A2B3] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={foundLocation}
              onChange={(e) => setFoundLocation(e.target.value)}
              placeholder="Contoh: Meja Lab Komputer 3, Kantin Bawah Gedung Unit 6"
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E4E7EC] text-base sm:text-sm text-[#111827] placeholder-[#98A2B3] focus:outline-none focus:border-[#1570EF] focus:ring-2 focus:ring-[#EFF8FF] transition-all"
            />
          </div>
          <p className="text-[11px] text-[#667085] mt-1">
            Pos penyimpanan resmi ditetapkan ketika petugas menerima fisik barang.
          </p>
        </div>
      </div>

      {/* Checkbox Persetujuan Penyerahan Fisik */}
      <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            required
            checked={agreedToPhysicalDrop}
            onChange={(e) => setAgreedToPhysicalDrop(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded text-[#1570EF] border-[#D0D5DD] focus:ring-[#1570EF]"
          />
          <span className="text-xs text-[#344054] leading-relaxed">
            Saya menyatakan bahwa saya menemukan barang ini di area kampus Universitas Budi Luhur dan <strong>berkomitmen untuk segera menyerahkan fisik barang ke {ACTIVE_SERVICE_POST.name} ({ACTIVE_SERVICE_POST.locationShort})</strong>.
          </span>
        </label>
      </div>

      {/* Form Action Buttons */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 rounded-xl border border-[#D0D5DD] text-xs sm:text-sm font-semibold text-[#475467] hover:text-[#111827] hover:bg-[#F9FAFB] transition-all cursor-pointer text-center"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={!agreedToPhysicalDrop || isSubmitting}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-b from-[#3194FF] to-[#0873F8] text-white text-xs sm:text-sm font-semibold hover:brightness-105 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100 flex items-center justify-center gap-2 shadow-[0px_4px_12px_rgba(22,119,255,0.2)] cursor-pointer"
        >
          {isSubmitting ? (
            <span>Mengirim Laporan...</span>
          ) : (
            <>
              <PlusCircle className="w-4 h-4" />
              <span>Kirim Laporan</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
