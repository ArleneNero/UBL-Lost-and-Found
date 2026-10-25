// Test setup file for Vitest
import { beforeEach } from 'vitest';
import { registry } from '@/services/registry';
import { mockStore } from '@/data/mockStore';

beforeEach(() => {
  registry.setMode('in-memory');
  mockStore.reset();
});
