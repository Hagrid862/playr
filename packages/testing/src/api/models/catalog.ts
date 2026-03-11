import type { Album, Artist, Track } from '@repo/db';
import { AlbumType, Visibility } from '@repo/db';
import { buildWithOverrides } from '../../shared';
import { now } from '../internal/time';

export function buildAlbum(overrides: Partial<Album> = {}): Album {
  const base: Album = {
    id: 'album-123',
    name: 'Test Album',
    description: null,
    type: AlbumType.album,
    releaseDate: now,
    totalTracks: 0,
    totalDuration: 0,
    coverId: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    visibility: Visibility.public,
  };

  return buildWithOverrides(base, overrides);
}

export function buildArtist(overrides: Partial<Artist> = {}): Artist {
  const base: Artist = {
    id: 'artist-123',
    name: 'Test Artist',
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

export function buildTrack(overrides: Partial<Track> = {}): Track {
  const base: Track = {
    id: 'track-123',
    title: 'Test Track',
    albumId: 'album-123',
    trackNumber: 1,
    diskNumber: 1,
    duration: 180,
    listenedCount: 0,
    explicit: false,
    visibility: Visibility.public,
    lyrics: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}

