import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGet = vi.fn().mockResolvedValue(null);
const mockSet = vi.fn().mockResolvedValue(undefined);
const mockDel = vi.fn().mockResolvedValue(undefined);

vi.stubGlobal('indexedDB', {});
vi.mock('idb-keyval', () => ({
  get: (key: string) => mockGet(key),
  set: (key: string, value: unknown) => mockSet(key, value),
  del: (key: string) => mockDel(key),
}));

describe('idb-storage', () => {
  let idbStorage: { getItem: (n: string) => Promise<unknown>; setItem: (n: string, v: unknown) => Promise<void>; removeItem: (n: string) => Promise<void> };

  beforeEach(async () => {
    mockGet.mockClear();
    mockSet.mockClear();
    mockDel.mockClear();
    vi.resetModules();
    const mod = await import('./idb-storage');
    idbStorage = mod.idbStorage;
  });

  it('getItem calls idb-keyval get and returns null when not found', async () => {
    mockGet.mockResolvedValue(null);

    const result = await idbStorage.getItem('auth-storage');

    expect(mockGet).toHaveBeenCalledWith('auth-storage');
    expect(result).toBeNull();
  });

  it('getItem returns parsed value when found', async () => {
    const stored = JSON.stringify({ foo: 'bar' });
    mockGet.mockResolvedValue(stored);

    const result = await idbStorage.getItem('auth-storage');

    expect(mockGet).toHaveBeenCalledWith('auth-storage');
    expect(result).toEqual({ foo: 'bar' });
  });

  it('setItem calls idb-keyval set with stringified value', async () => {
    await idbStorage.setItem('auth-storage', { user: null });

    expect(mockSet).toHaveBeenCalledWith('auth-storage', expect.any(String));
    expect(JSON.parse(mockSet.mock.calls[0][1])).toEqual({ user: null });
  });

  it('removeItem calls idb-keyval del', async () => {
    await idbStorage.removeItem('auth-storage');

    expect(mockDel).toHaveBeenCalledWith('auth-storage');
  });
});

describe('idb-storage (fallback when indexedDB undefined)', () => {
  let idbStorage: { getItem: (n: string) => Promise<unknown>; setItem: (n: string, v: unknown) => Promise<void>; removeItem: (n: string) => Promise<void> };

  beforeEach(async () => {
    vi.stubGlobal('indexedDB', undefined);
    vi.resetModules();
    const mod = await import('./idb-storage');
    idbStorage = mod.idbStorage;
  });

  it('getItem returns null when indexedDB is undefined', async () => {
    const result = await idbStorage.getItem('auth-storage');
    expect(result).toBeNull();
  });

  it('setItem is a no-op when indexedDB is undefined', async () => {
    await expect(idbStorage.setItem('auth-storage', {})).resolves.toBeUndefined();
  });

  it('removeItem is a no-op when indexedDB is undefined', async () => {
    await expect(idbStorage.removeItem('auth-storage')).resolves.toBeUndefined();
  });
});
