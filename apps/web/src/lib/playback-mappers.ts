import type { QueueItem } from '@/stores/player.store';
import type { PlaybackTrack, ZodTrack } from '@repo/contracts';

/** Stable client id for rows driven only by server `trackData`. */
const serverTrackUniqueId = (trackId: string) => `srv:${trackId}`;

/**
 * Minimal `ZodTrack` for UI/audio when hydrating from `PlaybackState.trackData`.
 * Rich relations are omitted; streaming still uses track `id`.
 */
export function playbackTrackToQueueItem(track: PlaybackTrack): QueueItem {
  return {
    uniqueId: serverTrackUniqueId(track.id),
    ...track,
    artists: track.artists ?? [],
  };
}

export function zodTrackToPlaybackTrack(track: ZodTrack): PlaybackTrack {
  return {
    id: track.id,
    title: track.title,
    artists: track.artists?.map((a) => a.name).filter(Boolean) ?? [],
    albumArt: track.album?.cover?.url ?? '',
    albumName: track.album?.name ?? '',
    albumId: track.albumId,
    duration: track.duration,
  };
}
