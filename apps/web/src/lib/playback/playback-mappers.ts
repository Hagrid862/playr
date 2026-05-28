import type {
  GetListenHistoryResponse,
  PlaybackTrack,
  QueueItem,
  ZodAlbum,
  ZodArtist,
  ZodImage,
  ZodTrack,
} from '@repo/contracts';
import { AlbumSystemKind, AlbumType, FileBucket, ImageUploadStatus, Visibility } from '@repo/db';
import { v6 as uuidv6 } from 'uuid';

import { UNKNOWN_ARTIST_LABEL } from '@/lib/display-constants';

export type ListenHistoryListItem = NonNullable<
  NonNullable<GetListenHistoryResponse['data']>['items']
>[number];

export function playbackTrackToQueueItem(
  track: PlaybackTrack,
  options?: {
    type?: 'queue' | 'playingNext';
    position?: number;
    originalPosition?: number;
  },
): QueueItem {
  const type = options?.type ?? 'queue';
  const position = options?.position ?? 0;
  const originalPosition = options?.originalPosition ?? position;
  return {
    queueId: uuidv6(),
    track: {
      id: track.id,
      title: track.title,
      trackId: track.trackId,
      artists: track.artists ?? [],
      albumName: track.albumName,
      albumId: track.albumId,
      albumArt: track.albumArt,
      duration: track.duration,
      explicit: track.explicit,
    },
    position,
    type,
    originalPosition,
  };
}

function buildOptimisticArtists(track: PlaybackTrack, now: Date): ZodArtist[] {
  return track.artists.map((name, index) => ({
    id: `optimistic-artist-${track.id}-${index}`,
    name,
    description: null,
    isCommunity: false,
    verified: true,
    bannerId: null,
    avatarId: null,
    visibility: Visibility.public,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }));
}

function buildOptimisticCover(track: PlaybackTrack, now: Date): ZodImage | null {
  if (!track.albumArt) {
    return null;
  }

  return {
    id: `optimistic-cover-${track.albumId}`,
    alt: track.albumName,
    bucket: FileBucket.public,
    key: track.albumId,
    url: track.albumArt,
    mimeType: 'image/jpeg',
    blurhash: null,
    reportId: null,
    uploadStatus: ImageUploadStatus.uploaded,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}

function buildOptimisticAlbum(track: PlaybackTrack, now: Date): ZodAlbum | undefined {
  if (!track.albumId) {
    return undefined;
  }

  return {
    id: track.albumId,
    name: track.albumName,
    description: null,
    type: AlbumType.album,
    systemKind: AlbumSystemKind.none,
    totalTracks: 1,
    totalDuration: track.duration,
    releaseDate: null,
    libraryId: null,
    coverId: null,
    visibility: Visibility.public,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    cover: buildOptimisticCover(track, now),
  };
}

/** Builds a contract-shaped track for optimistic listen-history cache updates. */
export function playbackTrackToZodTrack(track: PlaybackTrack, now = new Date()): ZodTrack {
  return {
    id: track.id,
    title: track.title,
    trackNumber: 1,
    diskNumber: 1,
    duration: track.duration,
    listenedCount: 0,
    explicit: track.explicit,
    lyrics: null,
    albumId: track.albumId,
    visibility: Visibility.public,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    artists: buildOptimisticArtists(track, now),
    album: buildOptimisticAlbum(track, now),
  };
}

export function createOptimisticListenHistoryItem(
  track: PlaybackTrack,
  optimisticId: string,
): ListenHistoryListItem {
  return {
    id: optimisticId,
    listenedAt: new Date().toISOString(),
    durationMs: 0,
    completed: false,
    track: playbackTrackToZodTrack(track),
  };
}

export function zodTrackToPlaybackTrack(track: ZodTrack): PlaybackTrack {
  const albumName = track.album?.name?.trim();
  const albumId = track.albumId?.trim();
  const artistNames = track.artists?.map((a) => a.name.trim()).filter(Boolean) ?? [];
  return {
    id: track.id,
    title: track.title.trim() || track.id,
    artists: artistNames.length > 0 ? artistNames : [UNKNOWN_ARTIST_LABEL],
    albumArt: track.album?.cover?.url ?? null,
    albumName: albumName && albumName.length > 0 ? albumName : 'Unknown album',
    albumId: albumId && albumId.length > 0 ? albumId : track.id,
    duration: track.duration,
    explicit: track.explicit,
    trackId: track.id,
  };
}
