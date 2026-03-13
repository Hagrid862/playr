import {
  AccessRole,
  type AlbumAccess,
  type ArtistAccess,
  type Track,
  type TrackAccess,
} from "@repo/db";
import { buildWithOverrides } from "../../shared";
import { now } from "../internal/time";
import { buildTrack } from "./catalog";

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

export type TrackWithAccess = Track & { access: TrackAccess[] };

export function buildTrackWithAccess(
  trackOverrides: Partial<Track> = {},
  accessOverrides: Partial<TrackAccess>[] = [
    { userId: "user-123", role: AccessRole.owner },
  ],
): TrackWithAccess {
  const track = buildTrack(trackOverrides);
  const access = accessOverrides.map((o) =>
    buildTrackAccess({ ...o, trackId: track.id }),
  );
  return { ...track, access };
}
