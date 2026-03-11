import type {
  Library,
  LibraryTrack,
  LibraryAlbum,
  LibraryArtist,
  LibraryFavorite,
  LibraryPin,
} from "@repo/db";
import { buildWithOverrides } from "../../shared";
import { now } from "../internal/time";

export function buildLibrary(overrides: Partial<Library> = {}): Library {
  const base: Library = {
    id: "library-123",
    userId: "user-123",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}

export function buildLibraryTrack(
  overrides: Partial<LibraryTrack> = {},
): LibraryTrack {
  const base: LibraryTrack = {
    id: "lib-track-123",
    libraryId: "library-123",
    trackId: "track-123",
    listenedCount: 0,
    listenCountResetAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}

export function buildLibraryAlbum(
  overrides: Partial<LibraryAlbum> = {},
): LibraryAlbum {
  const base: LibraryAlbum = {
    id: "lib-album-123",
    libraryId: "library-123",
    albumId: "album-123",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}

export function buildLibraryArtist(
  overrides: Partial<LibraryArtist> = {},
): LibraryArtist {
  const base: LibraryArtist = {
    id: "lib-artist-123",
    libraryId: "library-123",
    artistId: "artist-123",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}

export function buildLibraryFavorite(
  overrides: Partial<LibraryFavorite> = {},
): LibraryFavorite {
  const base: LibraryFavorite = {
    id: "lib-fav-123",
    order: 0,
    libraryId: "library-123",
    trackId: "track-123",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}

export function buildLibraryPin(
  overrides: Partial<LibraryPin> = {},
): LibraryPin {
  const base: LibraryPin = {
    id: "lib-pin-123",
    order: 0,
    libraryId: "library-123",
    artistId: null,
    albumId: null,
    trackId: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}
