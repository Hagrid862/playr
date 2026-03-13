import type {
    AlbumGetPayload,
    ArtistGetPayload,
    LibraryAlbum,
    LibraryArtist,
    LibraryTrack,
    TrackGetPayload,
} from "@repo/db";
import { AccessRole, AlbumType, FileBucket, Visibility } from "@repo/db";
import { buildWithOverrides } from "../../shared";
import { buildAlbumAccess, buildTrackAccess } from "../models/acl";
import { buildAlbum, buildArtist, buildTrack } from "../models/catalog";
import { buildLibraryAlbum, buildLibraryArtist, buildLibraryTrack } from "../models/library";
import { buildImage } from "../models/media";

// Types matching repository include shapes for integration test mocks

export type AlbumWithRelations = AlbumGetPayload<{
  include: { artists: true; genres: true; tracks: true; access: true; cover: true };
}>;

export type LibraryAlbumWithRelations = LibraryAlbum & {
  album: AlbumWithRelations;
};

export type TrackWithRelations = TrackGetPayload<{
  include: { artists: true; album: true; access: true };
}>;

export type LibraryTrackWithRelations = LibraryTrack & {
  track: TrackWithRelations;
};

export type ArtistWithRelations = ArtistGetPayload<{
  include: { avatar: true; banner: true };
}>;

export type LibraryArtistWithRelations = LibraryArtist & {
  artist: ArtistWithRelations;
};

// Relation builders for integration tests

export function buildAlbumWithRelations(
  overrides: Partial<AlbumWithRelations> = {},
): AlbumWithRelations {
  const album = buildAlbum({
    id: "album-123",
    name: "Test Album",
    description: "Test Description",
    type: AlbumType.album,
    totalTracks: 10,
    totalDuration: 3000,
    visibility: Visibility.private,
    ...overrides,
  });
  const access = [
    buildAlbumAccess({
      id: "access-123",
      userId: "user-123",
      role: AccessRole.owner,
      albumId: album.id,
    }),
  ];
  const base: AlbumWithRelations = {
    ...album,
    artists: overrides.artists ?? [],
    genres: overrides.genres ?? [],
    tracks: overrides.tracks ?? [],
    cover: overrides.cover ?? null,
    access,
  };
  return buildWithOverrides(base, overrides);
}

export function buildLibraryAlbumWithRelations(
  overrides: Partial<LibraryAlbumWithRelations> = {},
): LibraryAlbumWithRelations {
  const { album: albumOverrides, ...restOverrides } = overrides;
  const album = buildAlbumWithRelations(
    (albumOverrides as Partial<AlbumWithRelations>) ?? {},
  );
  const libraryAlbum = buildLibraryAlbum({
    libraryId: "library-123",
    albumId: album.id,
    ...restOverrides,
  });
  const base: LibraryAlbumWithRelations = {
    ...libraryAlbum,
    album,
  };
  return buildWithOverrides(base, overrides);
}

export function buildTrackWithRelations(
  overrides: Partial<TrackWithRelations> = {},
): TrackWithRelations {
  const album = buildAlbum({
    id: "album-123",
    name: "Test Album",
    description: "Test Description",
    type: AlbumType.album,
    totalTracks: 10,
    totalDuration: 3000,
    visibility: Visibility.public,
  });
  const track = buildTrack({
    id: "track-123",
    title: "Test Track",
    albumId: album.id,
    visibility: Visibility.private,
    ...overrides,
  });
  const artist = buildArtist({
    id: "artist-123",
    name: "Test Artist",
    description: "Test Description",
    verified: true,
  });
  const access = [
    buildTrackAccess({
      id: "access-123",
      userId: "user-123",
      role: AccessRole.owner,
      trackId: track.id,
    }),
  ];
  const base: TrackWithRelations = {
    ...track,
    album,
    artists: overrides.artists ?? [artist],
    access,
  };
  return buildWithOverrides(base, overrides);
}

export function buildLibraryTrackWithRelations(
  overrides: Partial<LibraryTrackWithRelations> = {},
): LibraryTrackWithRelations {
  const { track: trackOverrides, ...restOverrides } = overrides;
  const track = buildTrackWithRelations(
    (trackOverrides as Partial<TrackWithRelations>) ?? {},
  );
  const libraryTrack = buildLibraryTrack({
    libraryId: "library-123",
    trackId: track.id,
    ...restOverrides,
  });
  const base: LibraryTrackWithRelations = {
    ...libraryTrack,
    track,
  };
  return buildWithOverrides(base, overrides);
}

export function buildArtistWithRelations(
  overrides: Partial<ArtistWithRelations> = {},
): ArtistWithRelations {
  const artist = buildArtist({
    id: "artist-123",
    name: "Test Artist",
    description: "Test Description",
    visibility: Visibility.private,
    ...overrides,
  });
  const base: ArtistWithRelations = {
    ...artist,
    avatar: overrides.avatar ?? null,
    banner: overrides.banner ?? null,
  };
  return buildWithOverrides(base, overrides);
}

export function buildLibraryArtistWithRelations(
  overrides: Partial<LibraryArtistWithRelations> = {},
): LibraryArtistWithRelations {
  const { artist: artistOverrides, ...restOverrides } = overrides;
  const artist = buildArtistWithRelations(
    (artistOverrides as Partial<ArtistWithRelations>) ?? {},
  );
  const libraryArtist = buildLibraryArtist({
    libraryId: "library-123",
    artistId: artist.id,
    ...restOverrides,
  });
  const base: LibraryArtistWithRelations = {
    ...libraryArtist,
    artist,
  };
  return buildWithOverrides(base, overrides);
}

// Re-export buildImage with common integration overrides (public bucket, webp)
export function buildImageForIntegration(
  overrides: Partial<Parameters<typeof buildImage>[0]> = {},
) {
  return buildImage({
    id: "img-123",
    bucket: FileBucket.public,
    key: "test-key.webp",
    url: "https://cdn.example.com/test.webp",
    mimeType: "image/webp",
    ...overrides,
  });
}
