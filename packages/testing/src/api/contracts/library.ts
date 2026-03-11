import type {
  ZodLibrary,
  ZodLibraryArtist,
  ZodLibraryAlbum,
  ZodLibraryTrack,
  ZodLibraryFavorite,
  ZodLibraryPin,
} from '@repo/contracts';
import { buildWithOverrides } from '../../shared';
import { now } from '../internal/time';

export function buildZodLibrary(
  overrides: Partial<ZodLibrary> = {},
): ZodLibrary {
  const base: ZodLibrary = {
    id: 'library-1',
    userId: 'user-1',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}

export function buildZodLibraryArtist(
  overrides: Partial<ZodLibraryArtist> = {},
): ZodLibraryArtist {
  const base: ZodLibraryArtist = {
    id: 'library-artist-1',
    libraryId: 'library-1',
    artistId: 'artist-1',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}

export function buildZodLibraryAlbum(
  overrides: Partial<ZodLibraryAlbum> = {},
): ZodLibraryAlbum {
  const base: ZodLibraryAlbum = {
    id: 'library-album-1',
    libraryId: 'library-1',
    albumId: 'album-1',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}

export function buildZodLibraryTrack(
  overrides: Partial<ZodLibraryTrack> = {},
): ZodLibraryTrack {
  const base: ZodLibraryTrack = {
    id: 'library-track-1',
    listenedCount: 0,
    libraryId: 'library-1',
    trackId: 'track-1',
    createdAt: now,
    updatedAt: now,
    listenCountResetAt: null,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}

export function buildZodLibraryFavorite(
  overrides: Partial<ZodLibraryFavorite> = {},
): ZodLibraryFavorite {
  const base: ZodLibraryFavorite = {
    id: 'library-favorite-1',
    order: 1,
    libraryId: 'library-1',
    trackId: 'track-1',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}

export function buildZodLibraryPin(
  overrides: Partial<ZodLibraryPin> = {},
): ZodLibraryPin {
  const base: ZodLibraryPin = {
    id: 'library-pin-1',
    order: 1,
    libraryId: 'library-1',
    artistId: null,
    albumId: null,
    trackId: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}
