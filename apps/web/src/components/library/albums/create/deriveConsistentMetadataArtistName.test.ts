import { describe, expect, it } from 'vitest';
import { deriveConsistentMetadataArtistName } from './deriveConsistentMetadataArtistName';

describe('deriveConsistentMetadataArtistName', () => {
  it('returns null when no artist tags', () => {
    expect(deriveConsistentMetadataArtistName([{}, {}])).toBeNull();
  });

  it('returns the artist when all non-empty tags normalize to the same value', () => {
    expect(
      deriveConsistentMetadataArtistName([{ artist: 'Same Artist' }, { artist: 'same artist' }]),
    ).toBe('Same Artist');
  });

  it('returns the first non-empty display string when casing differs', () => {
    expect(deriveConsistentMetadataArtistName([{ artist: '  Foo  ' }, { artist: 'foo' }])).toBe(
      'Foo',
    );
  });

  it('ignores tracks with no artist when others agree', () => {
    expect(deriveConsistentMetadataArtistName([{ artist: 'Solo' }, {}, { artist: 'solo' }])).toBe(
      'Solo',
    );
  });

  it('returns null when artists conflict', () => {
    expect(deriveConsistentMetadataArtistName([{ artist: 'A' }, { artist: 'B' }])).toBeNull();
  });

  it('trims whitespace-only to empty', () => {
    expect(deriveConsistentMetadataArtistName([{ artist: '   ' }])).toBeNull();
  });
});
