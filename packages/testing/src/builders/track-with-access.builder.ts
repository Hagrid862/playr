import type { Track } from "@repo/db";
import { AccessRole } from "@repo/db";
import { trackAccessBuilder } from "./track-access.builder";
import { trackBuilder } from "./track.builder";

/**
 * Track with access array - used when repository returns track with include: { access: true }.
 * Use for permission/authorization tests (upload, delete, update).
 */
export type TrackWithAccess = Track & {
  access: Array<{ userId: string; role: AccessRole }>;
};

/**
 * Track with access and optional albumId - used for bulk upload where album scoping is validated.
 */
export type TrackWithAccessAndAlbumId = TrackWithAccess & {
  albumId?: string;
};

/**
 * Builds a track with access array for permission tests.
 * Pass access to customize, or userId/role for default owner access.
 */
export function trackWithAccessBuilder(
  overrides?: Partial<Track> & {
    access?: Array<{ userId: string; role: AccessRole }>;
    albumId?: string;
    userId?: string;
    role?: AccessRole;
  },
): TrackWithAccess | TrackWithAccessAndAlbumId {
  const {
    access,
    albumId,
    userId = "user-123",
    role = AccessRole.owner,
    ...trackOverrides
  } = overrides ?? {};
  const track = trackBuilder(trackOverrides);
  const accessArray = access ?? [
    trackAccessBuilder({ userId, role, trackId: track.id }),
  ];
  const base = {
    ...track,
    access: accessArray,
  };
  if (albumId !== undefined) {
    return { ...base, albumId };
  }
  return base;
}
