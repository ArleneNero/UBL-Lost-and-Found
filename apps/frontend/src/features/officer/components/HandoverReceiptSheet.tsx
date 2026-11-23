import React from 'react';
import { FoundItem } from '@/types/domain';
import { ACTIVE_SERVICE_POST } from '@/constants/locations';
import { formatWibDate, formatWibDateTime } from '../utils/wibDateFormatters';

export interface HandoverReceiptSheetProps {
  item: FoundItem;
  servicePostName?: string;
  servicePostLocation?: string;
}

/**
 * Lembar cetak A4 resmi Berita Acara Serah Terima (BAST) barang temuan.
 * Strictly excludes privateNotes.
 */
export const HandoverReceiptSheet: React.FC<HandoverReceiptSheetProps> = ({
  item,
  servicePostName = ACTIVE_SERVICE_POST.name,
  servicePostLocation = ACTIVE_SERVICE_POST.locationShort,
}) => {
  if (item.status !== 'RETURNED_TO_OWNER') return null;

  const record = item.returnRecord;
  const bastNumber = `BAST/${item.inventoryCode}`;
  const receivedLabel = formatWibDate(item.receivedAt, true);
  const returnedAtLabel = record?.returnedAt ? formatWibDateTime(record.returnedAt) : '-';
  const signatureDateLabel = record?.returnedAt
    ? formatWibDate(record.returnedAt, true)
    : formatWibDate(new Date().toISOString(), true);
  const officerName = record?.returnedByName || `Petugas ${servicePostName}`;

  const itemRows: Array<{ label: string; value: string; mono?: boolean }> = [
    { label: 'Kode Inventaris', value: item.inventoryCode, mono: true },
    { label: 'Nama Barang', value: item.name },
    { label: 'Kategori', value: item.category },
    { label: 'Lokasi Temuan', value: item.foundLocation || '-' },
    { label: 'Tanggal Diterima Pos', value: receivedLabel },
    { label: 'Deskripsi Publik', value: item.description || '-' },
  ];

  const handoverRows: Array<{ label: string; value: string }> = [
    { label: 'Nama Penerima', value: record?.recipientName || '-' },
    { label: 'NIM / ID Kampus', value: record?.recipientIdentifier || '-' },
    { label: 'Waktu Serah Terima', value: returnedAtLabel },
    { label: 'Ringkasan Verifikasi', value: record?.verificationSummary || '-' },
    { label: 'Petugas Penyerah', value: officerName },
  ];

  return (
    <article
      aria-label="Berita Acara Serah Terima Barang Temuan"
      className="bg-white text-gray-900 p-6 sm:p-8 print:p-0 border border-gray-200 print:border-0 rounded-lg print:rounded-none text-xs leading-relaxed"
    >
      <header className="border-b-2 border-gray-900 pb-4 mb-5 break-inside-avoid print-break-inside-avoid">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-600">
              Universitas Budi Luhur — UBL LostnFound
            </p>
            <h2 className="text-lg font-bold text-gray-900 mt-0.5">
              Berita Acara Serah Terima Barang Temuan (BAST)
            </h2>
            <p className="text-xs font-medium text-gray-700 mt-0.5">
              {servicePostName} — {servicePostLocation}
            </p>
          </div>
          <dl className="text-xs text-gray-700 sm:text-right space-y-0.5 shrink-0">
            <div>
              <dt className="inline font-semibold text-gray-900">Nomor BAST: </dt>
              <dd className="inline font-mono">{bastNumber}</dd>
            </div>
            <div>
              <dt className="inline font-semibold text-gray-900">Waktu Serah Terima: </dt>
              <dd className="inline">{returnedAtLabel}</dd>
            </div>
          </dl>
        </div>
      </header>

      <section aria-label="Identitas Barang Temuan" className="mb-5 break-inside-avoid print-break-inside-avoid">
        <h3 className="text-xs font-bold uppercase tracking-wide text-gray-900 mb-2">
          I. Identitas Barang Temuan
        </h3>
        <table className="w-full border-collapse border border-gray-300 text-[11px]">
          <tbody>
            {itemRows.map((row) => (
              <tr key={row.label}>
                <th scope="row" className="w-44 bg-gray-100 border border-gray-300 px-3 py-2 text-left font-semibold text-gray-800">
                  {row.label}
                </th>
                <td className={`border border-gray-300 px-3 py-2 text-gray-900 ${row.mono ? 'font-mono' : ''}`}>
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section aria-label="Detail Penerima dan Verifikasi" className="mb-5 break-inside-avoid print-break-inside-avoid">
        <h3 className="text-xs font-bold uppercase tracking-wide text-gray-900 mb-2">
          II. Detail Penerima &amp; Verifikasi Kepemilikan
        </h3>
        <table className="w-full border-collapse border border-gray-300 text-[11px]">
          <tbody>
            {handoverRows.map((row) => (
              <tr key={row.label}>
                <th scope="row" className="w-44 bg-gray-100 border border-gray-300 px-3 py-2 text-left font-semibold text-gray-800">
                  {row.label}
                </th>
                <td className="border border-gray-300 px-3 py-2 text-gray-900">
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mb-8 p-3.5 border border-gray-300 rounded-md bg-gray-50/70 text-[11px] text-gray-800 break-inside-avoid print-break-inside-avoid">
        <p>
          Dengan ditandatanganinya Berita Acara Serah Terima ini, pihak penerima menyatakan bahwa barang temuan tersebut di atas adalah benar miliknya, telah melalui proses pencocokan ciri kepemilikan secara langsung di {servicePostName}, dan diterima dalam kondisi baik.
        </p>
      </section>

      <footer className="grid grid-cols-2 gap-8 mt-6 break-inside-avoid print-break-inside-avoid text-center text-xs text-gray-800">
        <div>
          <p className="mt-5 font-semibold">Pihak Penerima</p>
          <div className="h-16" aria-hidden="true" />
          <p className="border-t border-gray-800 pt-1 font-medium mx-auto max-w-[220px]">
            {record?.recipientName || 'Nama Penerima'}
          </p>
          <p className="text-[11px] text-gray-600">
            {record?.recipientIdentifier ? `NIM / ID: ${record.recipientIdentifier}` : 'Pemilik / Penerima Barang'}
          </p>
        </div>

        <div>
          <p>Jakarta, {signatureDateLabel}</p>
          <p className="font-semibold mt-0.5">Petugas {servicePostName}</p>
          <div className="h-16" aria-hidden="true" />
          <p className="border-t border-gray-800 pt-1 font-medium mx-auto max-w-[220px]">
            {officerName}
          </p>
          <p className="text-[11px] text-gray-600">{servicePostLocation}</p>
        </div>
      </footer>
    </article>
  );
};
