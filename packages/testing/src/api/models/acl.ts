import {
  AccessRole,
  type ArtistAccess,
  type AlbumAccess,
  type TrackAccess,
} from "@repo/db";
import { buildWithOverrides } from "../../shared";
import { now } from "../internal/time";

export function buildArtistAccess(
  overrides: Partial<ArtistAccess> = {},
): ArtistAccess {
  const base: ArtistAccess = {
    id: "artist-access-123",
    artistId: "artist-123",
    userId: "user-123",
    role: AccessRole.viewer,
    createdAt: now,
    updatedAt: now,
  };

  return buildWithOverrides(base, overrides);
}

export function buildAlbumAccess(
  overrides: Partial<AlbumAccess> = {},
): AlbumAccess {
  const base: AlbumAccess = {
    id: "album-access-123",
    albumId: "album-123",
    userId: "user-123",
    role: AccessRole.viewer,
    createdAt: now,
    updatedAt: now,
  };

  return buildWithOverrides(base, overrides);
}

export function buildTrackAccess(
  overrides: Partial<TrackAccess> = {},
): TrackAccess {
  const base: TrackAccess = {
    id: "track-access-123",
    trackId: "track-123",
    userId: "user-123",
    role: AccessRole.viewer,
    createdAt: now,
    updatedAt: now,
  };

  return buildWithOverrides(base, overrides);
}
