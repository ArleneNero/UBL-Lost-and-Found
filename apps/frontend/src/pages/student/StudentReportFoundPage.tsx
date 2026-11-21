import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle, Info, MapPin } from 'lucide-react';
import { RoutePaths } from '@/constants/routes';
import { ACTIVE_SERVICE_POST } from '@/constants/locations';
import { useCreateReport } from '@/features/student/hooks/useCreateReport';
import { ReportFoundSuccess } from '@/features/student/components/ReportFoundSuccess';
import { ReportFoundForm, ReportFoundFormValues } from '@/features/student/components/ReportFoundForm';

export const StudentReportFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const { submitReport, isSubmitting, error, clearError } = useCreateReport();

  const [createdInfo, setCreatedInfo] = useState<{ code: string; id: string } | null>(null);

  const handleFormSubmit = async (values: ReportFoundFormValues) => {
    clearError();
    try {
      const res = await submitReport({
        ...values,
        targetPostId: 1, // Pos Pengajaran
      });
      setCreatedInfo({ code: res.reportCode, id: res.id });
    } catch {
      // Error is stored in hook state
    }
  };

  if (createdInfo) {
    return (
      <ReportFoundSuccess
        reportCode={createdInfo.code}
        reportId={createdInfo.id}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Page Introduction (Figma D | 04.01 #374:19995) */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight">
          Lapor Temuan
        </h1>
        <p className="text-xs sm:text-sm text-[#667085] mt-1.5 leading-relaxed">
          Menemukan barang milik orang lain? Laporkan di sini dan serahkan fisik barang ke posko operasional kampus.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-xs text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Two Column Layout (Figma D | 04.01 #374:19998) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Column: Form (760px / lg:col-span-8) */}
        <div className="lg:col-span-8">
          <ReportFoundForm
            isSubmitting={isSubmitting}
            onSubmit={handleFormSubmit}
            onCancel={() => navigate(RoutePaths.STUDENT_HOME)}
          />
        </div>

        {/* Context Column (408px / lg:col-span-4) */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          {/* Notice Card: Barang Perlu Diserahkan */}
          <div className="p-5 sm:p-6 bg-[#EAF3FF] border border-[#D1E9FF] rounded-2xl sm:rounded-3xl flex flex-col gap-3 shadow-xs">
            <div className="flex items-center gap-2.5 text-[#1570EF]">
              <Info className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold text-[#1570EF]">
                Barang perlu diserahkan
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-[#475467] leading-relaxed">
              Laporan penemuan Anda <strong>belum masuk ke katalog publik</strong> sebelum fisik barang diterima dan diverifikasi langsung oleh petugas pos.
            </p>
          </div>

          {/* Bantuan Penyerahan Card */}
          <div className="p-5 sm:p-6 bg-white border border-[#E4E7EC] rounded-2xl sm:rounded-3xl flex flex-col gap-3.5 shadow-xs">
            <h3 className="text-base font-bold text-[#111827]">
              Setelah laporan terkirim
            </h3>
            <p className="text-xs sm:text-sm text-[#667085] leading-relaxed">
              Simpan kode laporan Anda dan bawa barang ke {ACTIVE_SERVICE_POST.name} ({ACTIVE_SERVICE_POST.locationShort}). Petugas akan memeriksa kondisi barang dan mencocokkan kode laporan.
            </p>
            <div className="pt-2">
              <Link
                to={`${RoutePaths.POSTS}?from=lapor`}
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl border border-[#D1E9FF] bg-[#EFF8FF] text-[#1570EF] font-semibold text-xs sm:text-sm hover:bg-[#D1E9FF] transition-all"
              >
                <MapPin className="w-4 h-4" />
                <span>Lihat Pos Pelayanan</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
