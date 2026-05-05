import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isLocalPendingArtistId,
  makeLocalPendingArtistId,
  normalizeLibraryArtistNameForMatch,
} from './pendingLibraryArtist';

describe('pendingLibraryArtist', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('makeLocalPendingArtistId returns a local pending prefix', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('11111111-1111-1111-1111-111111111111');
    expect(makeLocalPendingArtistId()).toBe('local:pending:11111111-1111-1111-1111-111111111111');
  });

  it('isLocalPendingArtistId returns true only for local pending ids', () => {
    expect(isLocalPendingArtistId('local:pending:abc')).toBe(true);
    expect(isLocalPendingArtistId('uuid-from-server')).toBe(false);
    expect(isLocalPendingArtistId('')).toBe(false);
  });

  it('normalizeLibraryArtistNameForMatch trims and lowercases', () => {
    expect(normalizeLibraryArtistNameForMatch('  The Band  ')).toBe('the band');
  });
});
