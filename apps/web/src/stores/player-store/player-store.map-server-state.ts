import { getOrderedNextQueue } from '@/lib/playback/queue/playback-queue';
import type { PlaybackState } from '@repo/contracts';
import type { PlayerState } from './player-store.types';

export type MapServerPlaybackClientSnapshot = Pick<
  PlayerState,
  'localPlaybackDeviceId' | 'playbackVersion' | 'currentTime'
>;

/**
 * Maps a server `PlaybackState` broadcast/response into a Zustand patch.
 * Preserves local `currentTime` when this client owns active playback and was already synced.
 */
export function mapServerPlaybackToPatch(
  client: MapServerPlaybackClientSnapshot,
  server: PlaybackState,
): Pick<
  PlayerState,
  | 'playbackVersion'
  | 'playbackFavorited'
  | 'playbackInLibrary'
  | 'activeDeviceId'
  | 'currentTrack'
  | 'isPlaying'
  | 'currentTime'
  | 'volume'
  | 'repeatMode'
  | 'isShuffled'
  | 'duration'
  | 'queue'
  | 'history'
> {
  const sortedQueue = getOrderedNextQueue(server.queue, server.shuffle);
  const item = {
    id: server.trackData.id,
    title: server.trackData.title,
    artists: server.trackData.artists ?? [],
    albumArt: server.trackData.albumArt,
    albumName: server.trackData.albumName,
    albumId: server.trackData.albumId,
    duration: server.trackData.duration,
    explicit: server.trackData.explicit,
    trackId: server.trackData.trackId,
  };
  const isActiveOwner =
    Boolean(client.localPlaybackDeviceId) &&
    server.activeDeviceId != null &&
    server.activeDeviceId !== '' &&
    server.activeDeviceId === client.localPlaybackDeviceId;
  const skipTime = isActiveOwner && client.playbackVersion > 0 && server.isPlaying;

  return {
    playbackVersion: server.version,
    playbackFavorited: server.favorited,
    playbackInLibrary: server.inLibrary,
    activeDeviceId: server.activeDeviceId ?? null,
    currentTrack: item,
    isPlaying: server.isPlaying,
    currentTime: skipTime ? client.currentTime : server.currentTime,
    volume: server.volume,
    repeatMode: server.repeatMode,
    isShuffled: server.shuffle,
    duration: server.trackData.duration,
    queue: sortedQueue,
    history: server.history,
  };
}
