import {
  IItemService,
  GetItemsParams,
  GetOfficerItemsParams,
  CreateItemInput,
} from '../contracts/IItemService';
import { FoundItem, PaginatedResult, PostSettings, CleanInventoryResult } from '@/types/domain';
import { mapItemDtoToDomain } from '@/types/domain/mappers';
import { mockStore } from '@/data/mockStore';
import { InventoryOfficerDto, ItemReturnDto } from '@/types/api';

export class InMemoryItemService implements IItemService {
  async getItems(params?: GetItemsParams): Promise<PaginatedResult<FoundItem>> {
    const rawPage = params?.page || 1;
    const limit = params?.limit || 8;
    const search = params?.search?.toLowerCase();
    const category = params?.category;
    const postId = params?.postId;
    const sort = params?.sort || 'newest';

    const all = mockStore.getState().items;
    // Guest & Public: ONLY STORED and is_visible = true
    let filtered = all.filter((i) => i.status === 'STORED' && i.is_visible);

    if (search) {
      filtered = filtered.filter(
        (i) =>
          i.item_name.toLowerCase().includes(search) ||
          i.public_description.toLowerCase().includes(search) ||
          (i.found_location && i.found_location.toLowerCase().includes(search))
      );
    }

    if (category && category !== 'ALL') {
      filtered = filtered.filter((i) => i.category === category);
    }

    if (postId) {
      filtered = filtered.filter((i) => i.storage_post_id === postId);
    }

    // Sort by received_at
    filtered = [...filtered].sort((a, b) => {
      const timeA = new Date(a.received_at).getTime();
      const timeB = new Date(b.received_at).getTime();
      return sort === 'oldest' ? timeA - timeB : timeB - timeA;
    });

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const page = Math.min(Math.max(1, rawPage), totalPages);
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return {
      items: paginated.map((item) => ({
        ...mapItemDtoToDomain(item),
        privateNotes: null,
        returnRecord: null,
      })),
      page,
      limit,
      total,
      totalPages,
    };
  }

  async getOfficerItems(
    params?: GetOfficerItemsParams
  ): Promise<PaginatedResult<FoundItem>> {
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const search = params?.search?.toLowerCase();
    const category = params?.category;
    const status = params?.status;

    let filtered = [...mockStore.getState().items];
    if (params?.archivedOnly) {
      filtered = filtered.filter((i) => Boolean(i.archived_at));
    } else if (!params?.includeArchived) {
      filtered = filtered.filter((i) => !i.archived_at);
    }

    if (status) filtered = filtered.filter((i) => i.status === status);
    if (params?.isVisible !== undefined) {
      filtered = filtered.filter((i) => i.is_visible === params.isVisible);
    }
    if (category) filtered = filtered.filter((i) => i.category === category);
    if (search) {
      filtered = filtered.filter(
        (i) =>
          i.item_name.toLowerCase().includes(search) ||
          i.inventory_code.toLowerCase().includes(search)
      );
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return {
      items: paginated.map(mapItemDtoToDomain),
      page,
      limit,
      total,
      totalPages,
    };
  }

  async getItemById(id: string): Promise<FoundItem | null> {
    const found = mockStore.getState().items.find((i) => i.item_id === id);
    return found ? mapItemDtoToDomain(found) : null;
  }

  async getPublicItemById(id: string): Promise<FoundItem | null> {
    const found = mockStore.getState().items.find((i) => i.item_id === id);
    if (!found || found.status !== 'STORED' || !found.is_visible) {
      return null;
    }
    return {
      ...mapItemDtoToDomain(found),
      privateNotes: null,
      returnRecord: null,
    };
  }

  async createItem(input: CreateItemInput): Promise<FoundItem> {
    const count = mockStore.getState().items.length + 1;
    const code = `INV-2026-${String(count).padStart(4, '0')}`;
    const newItem: InventoryOfficerDto = {
      item_id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      inventory_code: code,
      item_name: input.name,
      category: input.category,
      public_description: input.description,
      found_location: input.foundLocation || null,
      found_on: input.foundDate || null,
      received_at: new Date().toISOString(),
      storage_post_id: 1,
      post: { post_id: 1, name: 'Pos Pengajaran' },
      storage_limit_days: mockStore.getState().postStorageLimitDays,
      status: 'STORED',
      is_visible: true,
      source_submission_id: null,
      private_verification_notes: input.privateNotes || null,
      photos: [
        {
          photo_id: `photo-${Date.now()}`,
          url: '/assets/branding/Logo_LostnFound.png',
          expires_at: '2026-12-31T23:59:59Z',
          is_primary: true,
        },
      ],
    };

    mockStore.getState().items.unshift(newItem);
    return mapItemDtoToDomain(newItem);
  }

  async updateVisibility(id: string, isVisible: boolean): Promise<FoundItem> {
    const item = mockStore.getState().items.find((i) => i.item_id === id);
    if (!item) throw new Error('Barang tidak ditemukan');
    item.is_visible = isVisible;
    return mapItemDtoToDomain(item);
  }

  async returnItem(
    id: string,
    recipientName: string,
    verificationSummary: string,
    recipientIdentifier?: string
  ): Promise<FoundItem> {
    const trimmedRecipient = recipientName?.trim();
    const trimmedSummary = verificationSummary?.trim();
    const trimmedIdentifier = recipientIdentifier?.trim() || null;

    if (!trimmedRecipient) {
      throw new Error('Nama penerima wajib diisi.');
    }
    if (!trimmedSummary) {
      throw new Error('Ringkasan verifikasi wajib diisi.');
    }

    const item = mockStore.getState().items.find((i) => i.item_id === id);
    if (!item) throw new Error('Barang tidak ditemukan');

    if (item.status !== 'STORED') {
      throw new Error('Barang tidak dalam status tersimpan (STORED) atau sudah diproses sebelumnya.');
    }

    const state = mockStore.getState();
    const alreadyReturned = state.returns.some((r) => r.item_id === id);
    if (alreadyReturned) {
      throw new Error('Barang sudah pernah diproses serah terima sebelumnya.');
    }

    const returnedAt = new Date().toISOString();
    const returnRecord: ItemReturnDto = {
      return_id: `ret-${Date.now()}`,
      item_id: id,
      recipient_name: trimmedRecipient,
      recipient_identifier: trimmedIdentifier,
      verification_summary: trimmedSummary,
      verification_confirmed_at: returnedAt,
      returned_at: returnedAt,
      returned_by_user_id: state.currentUser?.userId || 'user-officer-001',
      returned_by_name: state.currentUser?.fullName || 'Petugas Pos Pengajaran',
    };

    // Atomically record return
    state.returns.push(returnRecord);

    item.status = 'RETURNED_TO_OWNER';
    item.is_visible = false;
    item.private_verification_notes = `[DISERAHKAN: ${trimmedRecipient}] ${trimmedSummary}`;
    item.return_record = returnRecord;
    return mapItemDtoToDomain(item);
  }

  async distributeItem(id: string, notes: string): Promise<FoundItem> {
    const trimmedNotes = notes?.trim();
    if (!trimmedNotes) {
      throw new Error('Catatan tujuan penyaluran wajib diisi.');
    }

    const item = mockStore.getState().items.find((i) => i.item_id === id);
    if (!item) throw new Error('Barang tidak ditemukan');

    if (item.status !== 'STORED') {
      throw new Error('Barang tidak dalam status tersimpan (STORED) atau sudah diproses sebelumnya.');
    }

    item.status = 'DISTRIBUTED';
    item.is_visible = false;
    item.private_verification_notes = `[DISALURKAN] ${trimmedNotes}`;
    return mapItemDtoToDomain(item);
  }

  async getPostSettings(): Promise<PostSettings> {
    const state = mockStore.getState();
    const post = state.posts[0];
    return {
      postId: post?.post_id ?? 1,
      name: post?.name ?? 'Pos Pengajaran',
      storageLimitDays: state.postStorageLimitDays,
    };
  }

  async updatePostSettings(storageLimitDays: number): Promise<PostSettings> {
    if (!Number.isInteger(storageLimitDays) || storageLimitDays < 1 || storageLimitDays > 730) {
      throw new Error('Batas simpan harus antara 1 sampai 730 hari.');
    }
    const state = mockStore.getState();
    state.postStorageLimitDays = storageLimitDays;
    return this.getPostSettings();
  }

  async cleanCompletedInventory(month?: string): Promise<CleanInventoryResult> {
    const nowIso = new Date().toISOString();
    let count = 0;

    for (const item of mockStore.getState().items) {
      const isCompleted = item.status === 'RETURNED_TO_OWNER' || item.status === 'DISTRIBUTED';
      if (!isCompleted || item.archived_at) continue;
      if (month) {
        const wibMonth = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Jakarta',
          year: 'numeric',
          month: '2-digit',
        })
          .format(new Date(item.received_at))
          .slice(0, 7);
        if (wibMonth !== month) continue;
      }
      item.archived_at = nowIso;
      count += 1;
    }

    if (count === 0) {
      throw new Error(
        'Tidak ada barang selesai (Sudah Diserahkan atau Disalurkan) yang dapat diarsipkan pada periode tersebut.'
      );
    }

    return { archivedCount: count };
  }
}
