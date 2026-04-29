import { describe, expect, it } from 'vitest';
import { sha256HexFromBlob } from './sha256HexFromBlob';

describe('sha256HexFromBlob', () => {
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
});
