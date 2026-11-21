import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { validateAndPreparePhoto } from '@/utils/photoFile';
import { ReportPhotoUploader } from '@/features/student/components/ReportPhotoUploader';
import { ItemPhotoUploader } from '@/features/officer/components/ItemPhotoUploader';

describe('Photo Uploader & Dual-Source Choice (Kamera vs Upload File)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects invalid MIME types and oversized files in validateAndPreparePhoto', async () => {
    const pdfFile = new File(['dummy'], 'doc.pdf', { type: 'application/pdf' });
    await expect(validateAndPreparePhoto(pdfFile)).rejects.toThrow(/Format foto/);

    const hugeFile = new File([new Uint8Array(6 * 1024 * 1024)], 'big.png', {
      type: 'image/png',
    });
    await expect(validateAndPreparePhoto(hugeFile)).rejects.toThrow(/maksimal 5 MB/i);

    const validFile = new File(['abc'], 'item.jpg', { type: 'image/jpeg' });
    const result = await validateAndPreparePhoto(validFile);
    expect(result).toBe(validFile);
  });

  it('shows 2 options (Buka Kamera & Upload File) on Student ReportPhotoUploader click', () => {
    const onSelect = vi.fn();
    render(<ReportPhotoUploader selectedFile={null} onPhotoSelected={onSelect} />);

    fireEvent.click(screen.getByText('Buka Kamera atau Pilih File'));

    expect(screen.getByText('Pilih Sumber Foto')).toBeDefined();
    expect(screen.getByText('Buka Kamera')).toBeDefined();
    expect(screen.getByText('Upload File / Galeri')).toBeDefined();

    fireEvent.click(screen.getByText('Buka Kamera'));
    expect(screen.getByText('Ambil Foto Barang')).toBeDefined();
  });

  it('shows 2 options on Officer ItemPhotoUploader click and falls back smoothly when camera unavailable', () => {
    const onSelect = vi.fn();
    const onRemove = vi.fn();
    render(
      <ItemPhotoUploader previewUrl={null} onPhotoSelect={onSelect} onPhotoRemove={onRemove} />
    );

    fireEvent.click(screen.getByText('Unggah Foto Barang'));

    expect(screen.getByText('Pilih Sumber Foto')).toBeDefined();
    expect(screen.getByText('Buka Kamera')).toBeDefined();
    expect(screen.getByText('Upload File / Galeri')).toBeDefined();

    fireEvent.click(screen.getByText('Buka Kamera'));
    expect(screen.getByText('Ambil Foto Barang')).toBeDefined();
    expect(screen.getByText(/Upload File Sebagai Gantinya/i)).toBeDefined();
  });
});
