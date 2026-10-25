import { describe, it, expect, beforeEach } from 'vitest';
import { registry } from '@/services/registry';
import { mockStore } from '@/data/mockStore';

describe('Service Contracts & Registry (F/A.3)', () => {
  beforeEach(() => {
    mockStore.reset();
    registry.setMode('in-memory');
  });

  it('provides in-memory services in in-memory mode', () => {
    const services = registry.getServices();
    expect(services.mode).toBe('in-memory');
    expect(services.items).toBeDefined();
    expect(services.submissions).toBeDefined();
    expect(services.posts).toBeDefined();
    expect(services.auth).toBeDefined();
    expect(services.upload).toBeDefined();
  });

  it('provides http services in http mode', () => {
    registry.setMode('http');
    const services = registry.getServices();
    expect(services.mode).toBe('http');
    expect(services.items).toBeDefined();
    expect(services.upload).toBeDefined();
    expect(services.posts).toBeDefined();
  });

  it('filters public items strictly to STORED and is_visible', async () => {
    const services = registry.getServices();
    const result = await services.items.getItems();
    
    expect(result.items.length).toBeGreaterThan(0);
    result.items.forEach((item) => {
      expect(item.status).toBe('STORED');
      expect(item.isVisible).toBe(true);
      expect(item.privateNotes).toBeNull(); // Private notes must not leak to public
    });
  });

  it('creates an item and updates in-memory inventory atomically', async () => {
    const services = registry.getServices();
    const created = await services.items.createItem({
      name: 'Kacamata Rayban Hitam',
      category: 'Lainnya',
      description: 'Ditemukan di lab',
      foundLocation: 'Lab 1',
      photoToken: 'mock-token-123',
    });

    expect(created.id).toBeDefined();
    expect(created.inventoryCode).toMatch(/^INV-2026-\d{4}$/);
    expect(created.name).toBe('Kacamata Rayban Hitam');
    expect(created.status).toBe('STORED');

    const fetched = await services.items.getItemById(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.name).toBe('Kacamata Rayban Hitam');
  });

  it('handles submission lifecycle: create, receive, and reject', async () => {
    const services = registry.getServices();
    const sub = await services.submissions.createSubmission({
      targetPostId: 1,
      itemName: 'Buku Catatan Algoritma',
      category: 'Lainnya',
      description: 'Buku spiral sampul biru',
      foundLocation: 'Gedung 4 Lt. 2',
      foundDate: '2026-10-21',
      photoToken: 'mock-sub-token',
    });

    expect(sub.status).toBe('PENDING_RECEIPT');
    expect(sub.reportCode).toMatch(/^REP-2026-\d{4}$/);

    // Test rejection with reason
    const rejected = await services.submissions.rejectSubmission(
      sub.id,
      'Barang tidak diserahkan ke pos dalam batas waktu'
    );
    expect(rejected.status).toBe('REJECTED');
    expect(rejected.description).toContain('[DITOLAK]');
  });
});
