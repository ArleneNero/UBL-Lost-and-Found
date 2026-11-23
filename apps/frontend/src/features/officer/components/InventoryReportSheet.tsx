import React from 'react';
import { FoundItem } from '@/types/domain';
import { ACTIVE_SERVICE_POST } from '@/constants/locations';
import { InventoryReportSummary } from '../selectors/reportSummarySelectors';
import { formatWibDate, formatWibDateTime } from '../utils/wibDateFormatters';

export interface InventoryReportSheetProps {
  items: FoundItem[];
  summary: InventoryReportSummary;
  periodLabel: string;
  generatedAt: string;
  servicePostName?: string;
  servicePostLocation?: string;
  includeReturnDetails?: boolean;
}

const STATUS_LABELS: Record<FoundItem['status'], string> = {
  STORED: 'Tersedia di Pos',
  RETURNED_TO_OWNER: 'Sudah Diserahkan',
  DISTRIBUTED: 'Disalurkan',
};

/**
 * Lembar laporan inventaris resmi Pos Pengajaran untuk pratinjau modal dan cetak A4.
 */
export const InventoryReportSheet: React.FC<InventoryReportSheetProps> = ({
  items,
  summary,
  periodLabel,
  generatedAt,
  servicePostName = ACTIVE_SERVICE_POST.name,
  servicePostLocation = ACTIVE_SERVICE_POST.locationShort,
  includeReturnDetails = false,
}) => {
  const printedAtLabel = formatWibDateTime(generatedAt);
  const signatureDateLabel = formatWibDate(generatedAt, true);

  const statCards = [
    { label: 'Total Masuk', value: summary.total, note: null },
    {
      label: 'Tersedia di Pos',
      value: summary.stored,
      note: summary.overdue > 0 ? `${summary.overdue} melewati batas simpan` : null,
    },
    { label: 'Sudah Diserahkan', value: summary.returned, note: null },
    { label: 'Disalurkan', value: summary.distributed, note: null },
  ];

  return (
    <article className="bg-white text-gray-900 p-6 sm:p-8 print:p-0 border border-gray-200 print:border-0 rounded-lg print:rounded-none shadow-xs print:shadow-none text-xs leading-relaxed">
      {/* Official Header Kop */}
      <header className="border-b-2 border-gray-900 pb-4 mb-5 break-inside-avoid print-break-inside-avoid">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-600">
              Universitas Budi Luhur — UBL LostnFound
            </p>
            <h2 className="text-lg font-bold text-gray-900 mt-0.5">
              Laporan Inventaris Barang Temuan
            </h2>
            <p className="text-xs font-medium text-gray-700 mt-0.5">
              {servicePostName} — {servicePostLocation}
            </p>
          </div>
          <dl className="text-xs text-gray-700 sm:text-right space-y-0.5 shrink-0">
            <div>
              <dt className="inline font-semibold text-gray-900">Periode Laporan: </dt>
              <dd className="inline">{periodLabel}</dd>
            </div>
            <div>
              <dt className="inline font-semibold text-gray-900">Waktu Cetak: </dt>
              <dd className="inline">{printedAtLabel}</dd>
            </div>
          </dl>
        </div>
      </header>

      {/* Summary Statistics ("Berapa") */}
      <section
        aria-label="Ringkasan Statistik Inventaris"
        className="mb-6 space-y-3 break-inside-avoid print-break-inside-avoid"
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="border border-gray-300 rounded-md px-3.5 py-2.5 bg-gray-50/70"
            >
              <p className="text-[11px] font-medium text-gray-600">{card.label}</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{card.value}</p>
              {card.note && (
                <p className="text-[10px] font-medium text-amber-700 mt-0.5">{card.note}</p>
              )}
            </div>
          ))}
        </div>

        <div className="border border-gray-300 rounded-md px-3.5 py-2.5">
          <p className="text-[11px] font-semibold text-gray-700 mb-1.5">
            Ringkasan per Kategori
          </p>
          {summary.byCategory.length === 0 ? (
            <p className="text-[11px] text-gray-500">Tidak ada data kategori pada periode ini.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {summary.byCategory.map((entry) => (
                <span
                  key={entry.category}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-gray-300 bg-white text-[11px] text-gray-800"
                >
                  <span>{entry.category}</span>
                  <strong className="font-bold text-gray-900">{entry.count}</strong>
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Items Table ("Apa Saja") — Strictly excludes privateNotes */}
      <section aria-label="Daftar Barang Temuan" className="mb-8">
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full border-collapse border border-gray-300 text-left text-[11px]">
            <thead className="bg-gray-100 text-gray-900">
              <tr>
                <th scope="col" className="border border-gray-300 px-2.5 py-2 font-semibold w-10 text-center">
                  No
                </th>
                <th scope="col" className="border border-gray-300 px-2.5 py-2 font-semibold whitespace-nowrap">
                  Kode Inventaris
                </th>
                <th scope="col" className="border border-gray-300 px-2.5 py-2 font-semibold">
                  Nama Barang
                </th>
                <th scope="col" className="border border-gray-300 px-2.5 py-2 font-semibold">
                  Kategori
                </th>
                <th scope="col" className="border border-gray-300 px-2.5 py-2 font-semibold">
                  Lokasi Temuan
                </th>
                <th scope="col" className="border border-gray-300 px-2.5 py-2 font-semibold whitespace-nowrap">
                  Tanggal Diterima
                </th>
                <th scope="col" className="border border-gray-300 px-2.5 py-2 font-semibold whitespace-nowrap">
                  Status
                </th>
                {includeReturnDetails && (
                  <th scope="col" className="border border-gray-300 px-2.5 py-2 font-semibold">
                    Detail Serah Terima
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={includeReturnDetails ? 8 : 7}
                    className="border border-gray-300 px-3 py-6 text-center text-gray-500"
                  >
                    Tidak ada barang inventaris pada periode dan filter yang dipilih.
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr key={item.id} className="break-inside-avoid print-break-inside-avoid">
                    <td className="border border-gray-300 px-2.5 py-2 text-center text-gray-700">
                      {idx + 1}
                    </td>
                    <td className="border border-gray-300 px-2.5 py-2 font-mono text-gray-800 whitespace-nowrap">
                      {item.inventoryCode}
                    </td>
                    <td className="border border-gray-300 px-2.5 py-2 font-medium text-gray-900">
                      {item.name}
                    </td>
                    <td className="border border-gray-300 px-2.5 py-2 text-gray-700">
                      {item.category}
                    </td>
                    <td className="border border-gray-300 px-2.5 py-2 text-gray-700">
                      {item.foundLocation || '-'}
                    </td>
                    <td className="border border-gray-300 px-2.5 py-2 text-gray-700 whitespace-nowrap">
                      {formatWibDate(item.receivedAt)}
                    </td>
                    <td className="border border-gray-300 px-2.5 py-2 text-gray-800 whitespace-nowrap">
                      {STATUS_LABELS[item.status] || item.status}
                    </td>
                    {includeReturnDetails && (
                      <td className="border border-gray-300 px-2.5 py-2 text-gray-800 align-top">
                        {item.status === 'RETURNED_TO_OWNER' && item.returnRecord ? (
                          <div className="space-y-0.5 leading-snug">
                            <div className="font-semibold text-gray-900">
                              {item.returnRecord.recipientName}
                              {item.returnRecord.recipientIdentifier && (
                                <span className="font-normal text-gray-600">
                                  {' '}({item.returnRecord.recipientIdentifier})
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-600">
                              {formatWibDateTime(item.returnRecord.returnedAt)}
                            </div>
                            <div className="text-[10px] text-gray-700">
                              Verifikasi: {item.returnRecord.verificationSummary}
                            </div>
                            <div className="text-[10px] text-gray-600">
                              Petugas: {item.returnRecord.returnedByName || 'Petugas Pos Pengajaran'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Officer Signature Block */}
      <footer className="flex justify-end mt-6 break-inside-avoid print-break-inside-avoid">
        <div className="w-64 text-center text-xs text-gray-800">
          <p>Jakarta, {signatureDateLabel}</p>
          <p className="font-semibold mt-0.5">Petugas {servicePostName}</p>
          <div className="h-16" aria-hidden="true" />
          <p className="border-t border-gray-800 pt-1 font-medium">
            Petugas Piket {servicePostName}
          </p>
          <p className="text-[11px] text-gray-600">{servicePostLocation}</p>
        </div>
      </footer>
    </article>
  );
};
