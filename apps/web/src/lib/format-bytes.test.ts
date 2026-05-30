import { describe, expect, it } from 'vitest';
import { formatBytes } from './format-bytes';

describe('formatBytes', () => {
  it('formats zero and small values', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
  });

  it('returns zero bytes for invalid or negative input', () => {
    expect(formatBytes(-1)).toBe('0 B');
    expect(formatBytes(Number.NaN)).toBe('0 B');
    expect(formatBytes(Number.POSITIVE_INFINITY)).toBe('0 B');
  });

  it('formats gigabytes', () => {
    expect(formatBytes(2 * 1024 ** 3)).toBe('2 GB');
    expect(formatBytes(5 * 1024 ** 3)).toBe('5 GB');
  });
});
