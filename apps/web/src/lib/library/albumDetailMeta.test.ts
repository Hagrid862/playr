import { AlbumType } from '@repo/db';
import { describe, expect, it } from 'vitest';
import {
  albumTypeDisplayName,
  buildGenreMiddleSegment,
  formatAlbumReleaseDateSegment,
  genreNamesFromAlbumGenres,
} from './albumDetailMeta';

describe('genreNamesFromAlbumGenres', () => {
  it('returns empty for undefined or empty', () => {
    expect(genreNamesFromAlbumGenres(undefined)).toEqual([]);
    expect(genreNamesFromAlbumGenres([])).toEqual([]);
  });

  it('collects trimmed names in API order', () => {
    expect(
      genreNamesFromAlbumGenres([
        { genre: { name: '  Rock  ' } },
        { genre: null },
        { genre: { name: 'Jazz' } },
      ]),
    ).toEqual(['Rock', 'Jazz']);
  });
});

describe('buildGenreMiddleSegment', () => {
  it('uses No Genre when empty', () => {
    expect(buildGenreMiddleSegment([])).toEqual({
      text: 'No Genre',
      showTooltip: false,
      tooltipLines: [],
    });
  });

  it('uses single name when one genre', () => {
    expect(buildGenreMiddleSegment(['Ambient'])).toEqual({
      text: 'Ambient',
      showTooltip: false,
      tooltipLines: ['Ambient'],
    });
  });

  it('summarizes two genres with singular more genre', () => {
    expect(buildGenreMiddleSegment(['Rock', 'Jazz'])).toEqual({
      text: 'Rock and 1 more genre',
      showTooltip: true,
      tooltipLines: ['Rock', 'Jazz'],
    });
  });

  it('summarizes three+ genres with plural more genres', () => {
    expect(buildGenreMiddleSegment(['Rock', 'Jazz', 'Blues'])).toEqual({
      text: 'Rock and 2 more genres',
      showTooltip: true,
      tooltipLines: ['Rock', 'Jazz', 'Blues'],
    });
  });
});

describe('albumTypeDisplayName', () => {
  it('capitalizes enum key like edit form', () => {
    expect(albumTypeDisplayName(AlbumType.album)).toBe('Album');
    expect(albumTypeDisplayName(AlbumType.ep)).toBe('Ep');
    expect(albumTypeDisplayName(AlbumType.compilation)).toBe('Compilation');
  });
});

describe('formatAlbumReleaseDateSegment', () => {
  it('returns null for missing or invalid', () => {
    expect(formatAlbumReleaseDateSegment(null)).toBeNull();
    expect(formatAlbumReleaseDateSegment(undefined)).toBeNull();
    expect(formatAlbumReleaseDateSegment('not-a-date')).toBeNull();
  });

  it('formats ISO strings', () => {
    expect(formatAlbumReleaseDateSegment('2024-06-15T12:00:00.000Z')).toMatch(/Jun/);
    expect(formatAlbumReleaseDateSegment('2024-06-15T12:00:00.000Z')).toMatch(/2024/);
  });
});
