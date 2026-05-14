import type { PlaybackTrack, QueueItem, ZodTrack } from '@repo/contracts';
import { v6 as uuidv6 } from 'uuid';

export function playbackTrackToQueueItem(track: PlaybackTrack): QueueItem {
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
    position: 0,
  };
}

export function zodTrackToPlaybackTrack(track: ZodTrack): PlaybackTrack {
  const albumName = track.album?.name?.trim();
  const albumId = track.albumId?.trim();
  return {
    id: track.id,
    title: track.title.trim() || track.id,
    artists: track.artists?.map((a) => a.name).filter(Boolean) ?? [],
    albumArt: track.album?.cover?.url ?? null,
    albumName: albumName && albumName.length > 0 ? albumName : 'Unknown album',
    albumId: albumId && albumId.length > 0 ? albumId : track.id,
    duration: track.duration,
    explicit: track.explicit,
    trackId: track.id,
  };
}
