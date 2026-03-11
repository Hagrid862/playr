import type {
  ZodGenre,
  ZodArtistGenre,
  ZodAlbumGenre,
  ZodTrackGenre,
  ZodListenHistory,
  ZodSearchHistory,
} from '@repo/contracts';
import { buildWithOverrides } from '../../shared';
import { now } from '../internal/time';

export function buildZodGenre(overrides: Partial<ZodGenre> = {}): ZodGenre {
  const base: ZodGenre = {
    id: 'genre-1',
    name: 'Test Genre',
    slug: 'test-genre',
    description: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}

export function buildZodArtistGenre(
  overrides: Partial<ZodArtistGenre> = {},
): ZodArtistGenre {
  const base: ZodArtistGenre = {
    id: 'artist-genre-1',
    artistId: 'artist-1',
    genreId: 'genre-1',
    createdAt: now,
    updatedAt: now,
  };

  return buildWithOverrides(base, overrides);
}

export function buildZodAlbumGenre(
  overrides: Partial<ZodAlbumGenre> = {},
): ZodAlbumGenre {
  const base: ZodAlbumGenre = {
    id: 'album-genre-1',
    albumId: 'album-1',
    genreId: 'genre-1',
    createdAt: now,
    updatedAt: now,
  };

  return buildWithOverrides(base, overrides);
}

export function buildZodTrackGenre(
  overrides: Partial<ZodTrackGenre> = {},
): ZodTrackGenre {
  const base: ZodTrackGenre = {
    id: 'track-genre-1',
    trackId: 'track-1',
    genreId: 'genre-1',
    createdAt: now,
    updatedAt: now,
  };

  return buildWithOverrides(base, overrides);
}

export function buildZodListenHistory(
  overrides: Partial<ZodListenHistory> = {},
): ZodListenHistory {
  const base: ZodListenHistory = {
    id: 'listen-history-1',
    listenedAt: now,
    durationMs: 180000,
    completed: true,
    userId: 'user-1',
    trackId: 'track-1',
    createdAt: now,
    updatedAt: now,
  };

  return buildWithOverrides(base, overrides);
}

export function buildZodSearchHistory(
  overrides: Partial<ZodSearchHistory> = {},
): ZodSearchHistory {
  const base: ZodSearchHistory = {
    id: 'search-history-1',
    query: 'test query',
    searchedAt: now,
    userId: 'user-1',
    createdAt: now,
    updatedAt: now,
  };

  return buildWithOverrides(base, overrides);
}
