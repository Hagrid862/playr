import type { Playlist, PlaylistTrack } from "@repo/db";
import { buildWithOverrides } from "../../shared";
import { now } from "../internal/time";

export function buildPlaylist(overrides: Partial<Playlist> = {}): Playlist {
  const base: Playlist = {
    id: "playlist-123",
    name: "Test Playlist",
    description: null,
    isPublic: false,
    isCollaborative: false,
    libraryId: null,
    artistId: null,
    coverId: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}

export function buildPlaylistTrack(
  overrides: Partial<PlaylistTrack> = {},
): PlaylistTrack {
  const base: PlaylistTrack = {
    id: "playlist-track-123",
    order: 0,
    playlistId: "playlist-123",
    trackId: "track-123",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}
