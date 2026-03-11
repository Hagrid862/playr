import {
  CreditRole,
  type Genre,
  type ArtistGenre,
  type AlbumGenre,
  type TrackGenre,
  type ArtistFollow,
  type ListenHistory,
  type SearchHistory,
  type TrackCredit,
} from "@repo/db";
import { buildWithOverrides } from "../../shared";
import { now } from "../internal/time";

export function buildGenre(overrides: Partial<Genre> = {}): Genre {
  const base: Genre = {
    id: "genre-123",
    name: "Pop",
    slug: "pop",
    description: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}

export function buildArtistGenre(
  overrides: Partial<ArtistGenre> = {},
): ArtistGenre {
  const base: ArtistGenre = {
    id: "artist-genre-123",
    artistId: "artist-123",
    genreId: "genre-123",
    createdAt: now,
    updatedAt: now,
  };

  return buildWithOverrides(base, overrides);
}

export function buildAlbumGenre(
  overrides: Partial<AlbumGenre> = {},
): AlbumGenre {
  const base: AlbumGenre = {
    id: "album-genre-123",
    albumId: "album-123",
    genreId: "genre-123",
    createdAt: now,
    updatedAt: now,
  };

  return buildWithOverrides(base, overrides);
}

export function buildTrackGenre(
  overrides: Partial<TrackGenre> = {},
): TrackGenre {
  const base: TrackGenre = {
    id: "track-genre-123",
    trackId: "track-123",
    genreId: "genre-123",
    createdAt: now,
    updatedAt: now,
  };

  return buildWithOverrides(base, overrides);
}

export function buildArtistFollow(
  overrides: Partial<ArtistFollow> = {},
): ArtistFollow {
  const base: ArtistFollow = {
    id: "artist-follow-123",
    profileId: "community-profile-123",
    artistId: "artist-123",
    createdAt: now,
    updatedAt: now,
  };

  return buildWithOverrides(base, overrides);
}

export function buildListenHistory(
  overrides: Partial<ListenHistory> = {},
): ListenHistory {
  const base: ListenHistory = {
    id: "listen-history-123",
    listenedAt: now,
    durationMs: 180000,
    completed: true,
    userId: "user-123",
    trackId: "track-123",
    createdAt: now,
    updatedAt: now,
  };

  return buildWithOverrides(base, overrides);
}

export function buildSearchHistory(
  overrides: Partial<SearchHistory> = {},
): SearchHistory {
  const base: SearchHistory = {
    id: "search-history-123",
    query: "test query",
    searchedAt: now,
    userId: "user-123",
    createdAt: now,
    updatedAt: now,
  };

  return buildWithOverrides(base, overrides);
}

export function buildTrackCredit(
  overrides: Partial<TrackCredit> = {},
): TrackCredit {
  const base: TrackCredit = {
    id: "track-credit-123",
    name: "Test Artist",
    role: CreditRole.producer,
    trackId: "track-123",
    createdAt: now,
    updatedAt: now,
  };

  return buildWithOverrides(base, overrides);
}
