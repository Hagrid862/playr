import { describe, expect, it } from 'vitest';
import { buildGetLibraryTracksOrderBy } from './get-library-tracks.order-by';

describe('buildGetLibraryTracksOrderBy', () => {
  it('returns default order with tie-breaker when sort omitted', () => {
    expect(buildGetLibraryTracksOrderBy(undefined, undefined)).toEqual([
      { track: { trackNumber: 'asc' } },
      { track: { id: 'asc' } },
    ]);
  });

  it('returns default when sortBy is set but sortOrder is missing', () => {
    expect(buildGetLibraryTracksOrderBy('title', undefined)).toEqual([
      { track: { trackNumber: 'asc' } },
      { track: { id: 'asc' } },
    ]);
  });

  it('returns default when sortOrder is set but sortBy is missing', () => {
    expect(buildGetLibraryTracksOrderBy(undefined, 'asc')).toEqual([
      { track: { trackNumber: 'asc' } },
      { track: { id: 'asc' } },
    ]);
  });

  it('maps title + desc with tie-breaker', () => {
    expect(buildGetLibraryTracksOrderBy('title', 'desc')).toEqual([
      { track: { title: 'desc' } },
      { track: { id: 'asc' } },
    ]);
  });

  it('maps title asc with tie-breaker', () => {
    expect(buildGetLibraryTracksOrderBy('title', 'asc')).toEqual([
      { track: { title: 'asc' } },
      { track: { id: 'asc' } },
    ]);
  });

  it('maps duration with tie-breaker', () => {
    expect(buildGetLibraryTracksOrderBy('duration', 'desc')).toEqual([
      { track: { duration: 'desc' } },
      { track: { id: 'asc' } },
    ]);
  });

  it('maps trackNumber with tie-breaker', () => {
    expect(buildGetLibraryTracksOrderBy('trackNumber', 'asc')).toEqual([
      { track: { trackNumber: 'asc' } },
      { track: { id: 'asc' } },
    ]);
  });

  it('maps diskNumber with tie-breaker', () => {
    expect(buildGetLibraryTracksOrderBy('diskNumber', 'desc')).toEqual([
      { track: { diskNumber: 'desc' } },
      { track: { id: 'asc' } },
    ]);
  });

  it('maps album name with tie-breaker', () => {
    expect(buildGetLibraryTracksOrderBy('album', 'asc')).toEqual([
      { track: { album: { name: 'asc' } } },
      { track: { id: 'asc' } },
    ]);
  });

  it('throws for artist (handled via raw SQL in handler)', () => {
    expect(() => buildGetLibraryTracksOrderBy('artist', 'asc')).toThrow(
      'buildGetLibraryTracksOrderBy: artist sort is handled separately',
    );
  });
});
