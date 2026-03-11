import type { ZodPlaylist, ZodPlaylistTrack } from "@repo/contracts";
import { buildWithOverrides } from "../../shared";
import { now } from "../internal/time";

export function buildZodPlaylist(
  overrides: Partial<ZodPlaylist> = {},
): ZodPlaylist {
  const base: ZodPlaylist = {
    id: "playlist-1",
    name: "Test Playlist",
    description: null,
    isPublic: true,
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

export function buildZodPlaylistTrack(
  overrides: Partial<ZodPlaylistTrack> = {},
): ZodPlaylistTrack {
  const base: ZodPlaylistTrack = {
    id: "playlist-track-1",
    order: 1,
    playlistId: "playlist-1",
    trackId: "track-1",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}
