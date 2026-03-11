import { AlbumType, Visibility } from "@repo/db";
import type { ZodArtist, ZodAlbum, ZodTrack } from "@repo/contracts";
import { buildWithOverrides } from "../../shared";
import { now } from "../internal/time";

export function buildZodArtist(overrides: Partial<ZodArtist> = {}): ZodArtist {
  const base: ZodArtist = {
    id: "artist-1",
    name: "Mock Artist",
    description: null,
    isCommunity: false,
    verified: false,
    bannerId: null,
    avatarId: null,
    visibility: Visibility.public,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}

export function buildZodAlbum(overrides: Partial<ZodAlbum> = {}): ZodAlbum {
  const base: ZodAlbum = {
    id: "album-1",
    name: "Mock Album",
    description: null,
    type: AlbumType.album,
    releaseDate: now,
    totalTracks: 10,
    totalDuration: 3000,
    coverId: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    visibility: Visibility.public,
    cover: null,
  };

  return buildWithOverrides(base, overrides);
}

export function buildZodTrack(overrides: Partial<ZodTrack> = {}): ZodTrack {
  const base: ZodTrack = {
    id: "track-1",
    title: "Mock Track",
    trackNumber: 1,
    diskNumber: 1,
    duration: 180,
    listenedCount: 0,
    explicit: false,
    lyrics: null,
    albumId: "album-1",
    visibility: Visibility.public,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}
