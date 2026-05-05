import { afterEach, describe, expect, it, vi } from 'vitest';
import { sha256HexFromBlob } from './sha256HexFromBlob';

describe('sha256HexFromBlob', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a 64-character hex string for a small blob', async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])]);
    const hex = await sha256HexFromBlob(blob);
    expect(hex).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns the same digest for identical bytes', async () => {
    const a = new Blob([new Uint8Array([9, 9, 9])]);
    const b = new Blob([new Uint8Array([9, 9, 9])]);
    expect(await sha256HexFromBlob(a)).toBe(await sha256HexFromBlob(b));
  });

  it('uses blob.arrayBuffer when it is a function (non-native Blob)', async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const blob = {
      arrayBuffer: async () =>
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    } as Blob;

    const hex = await sha256HexFromBlob(blob);
    expect(hex).toMatch(/^[0-9a-f]{64}$/);
  });

  it('falls back to FileReader when arrayBuffer is missing', async () => {
    const blob = new Blob([new Uint8Array([7, 8])]);
    Object.defineProperty(blob, 'arrayBuffer', { value: undefined });

    const hex = await sha256HexFromBlob(blob);
    expect(hex).toMatch(/^[0-9a-f]{64}$/);
  });

  it('rejects when FileReader fails', async () => {
    const blob = new Blob([new Uint8Array([1])]);
    Object.defineProperty(blob, 'arrayBuffer', { value: undefined });

    vi.spyOn(FileReader.prototype, 'readAsArrayBuffer').mockImplementation(function (this: FileReader) {
      queueMicrotask(() => {
        Object.defineProperty(this, 'error', {
          value: new DOMException('read failed', 'NotReadableError'),
          configurable: true,
        });
        this.onerror?.(new ProgressEvent('error'));
      });
    });

    await expect(sha256HexFromBlob(blob)).rejects.toBeDefined();
  });
});
