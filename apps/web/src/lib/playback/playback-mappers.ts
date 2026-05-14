import type { PlaybackTrack, QueueItem, ZodTrack } from '@repo/contracts';
import { v6 as uuidv6 } from 'uuid';

import { UNKNOWN_ARTIST_LABEL } from '@/lib/display-constants';

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
