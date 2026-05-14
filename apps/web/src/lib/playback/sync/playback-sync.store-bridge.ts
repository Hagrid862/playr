import { getOrderedNextQueue } from '@/lib/playback/queue/playback-queue';
import { isLocalActiveDevice } from '@/stores/player-store/player-store.utils';
import { usePlayerStore } from '@/stores/player-store/player.store';
import {
  PLAYBACK_HISTORY_MAX_LENGTH,
  type PlaybackState,
  type PlaybackTrack,
  type SetPlaybackStateRequest,
} from '@repo/contracts';

/**
 * Apply a time-only server update (broadcast or set-current-time ack).
 * Ignores stale `version`; does not overwrite `currentTime` on the device that is playing audio.
 */
export function applyCurrentTimeServerUpdate(payload: { currentTime: number; version: number }) {
  const s = usePlayerStore.getState();
  if (payload.version < s.playbackVersion) return;

  if (isLocalActiveDevice(s.activeDeviceId, s.localPlaybackDeviceId)) {
    usePlayerStore.setState({ playbackVersion: payload.version });
  } else {
    usePlayerStore.setState({
      playbackVersion: payload.version,
      currentTime: payload.currentTime,
    });
  }
}

export function buildSetStateBody(trackData: PlaybackTrack): SetPlaybackStateRequest['state'] {
  const s = usePlayerStore.getState();
  const safeCurrentTime = Number.isFinite(s.currentTime) ? s.currentTime : 0;
  const safeVolume = Number.isFinite(s.volume) ? s.volume : 1;
  const queue = getOrderedNextQueue(s.queue, s.isShuffled).map((item, index) => ({
    ...item,
    position: index,
  }));
  return {
    devices: s.playbackDevices.map((d) => ({ id: d.id, name: d.name, icon: d.icon })),
    isPlaying: s.isPlaying,
    trackData,
    currentTime: Math.min(Math.max(0, Math.floor(safeCurrentTime)), trackData.duration),
    volume: Math.min(1, Math.max(0, safeVolume)),
    repeatMode: s.repeatMode,
    shuffle: s.isShuffled,
    queue,
    history: s.history.slice(0, PLAYBACK_HISTORY_MAX_LENGTH),
    favorited: s.playbackFavorited,
    inLibrary: s.playbackInLibrary,
  };
}

export function applyStateFromServer(state: PlaybackState) {
  usePlayerStore.getState().applyPlaybackStateFromServer(state);
}
