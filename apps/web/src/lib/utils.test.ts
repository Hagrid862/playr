import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn utility', () => {
  it('merges class names correctly', () => {
    expect(cn('c-1', 'c-2')).toBe('c-1 c-2');
  });

  it('handles conditional class names', () => {
    const isTrue = true;
    const isFalse = false;
    expect(cn('c-1', isTrue && 'c-2', isFalse && 'c-3')).toBe('c-1 c-2');
  });

  it('merges tailwind classes correctly (overrides)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('px-2 py-2', 'p-4')).toBe('p-4');
  });

  it('handles arrays and objects', () => {
    expect(cn(['c-1', 'c-2'])).toBe('c-1 c-2');
    expect(cn({ 'c-1': true, 'c-2': false })).toBe('c-1');
  });
});
