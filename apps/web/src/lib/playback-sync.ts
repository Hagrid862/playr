import { zodTrackToPlaybackTrack } from '@/lib/playback-mappers';
import { createPlaybackSocket } from '@/lib/playback-socket';
import { usePlayerStore } from '@/stores/player.store';
import type { PlaybackState, SetPlaybackStateRequest } from '@repo/contracts';
import type { Socket } from 'socket.io-client';

let socket: Socket | null = null;

function buildSetStateBody(
  trackData: ReturnType<typeof zodTrackToPlaybackTrack>,
): SetPlaybackStateRequest['state'] {
  const s = usePlayerStore.getState();
  return {
    deviceName: 'Web',
    deviceIcon: 'desktop',
    isPlaying: s.isPlaying,
    trackData,
    currentTime: Math.min(Math.max(0, Math.floor(s.currentTime)), trackData.duration),
    volume: Math.min(1, Math.max(0, s.volume)),
    repeatMode: s.repeatMode,
    shuffle: s.isShuffled,
    // Send current queue with normalized positions
    queue: s.queue.map((item, index) => ({ ...item, position: index })),
    favorited: s.playbackFavorited,
    inLibrary: s.playbackInLibrary,
  };
}

export function applyStateFromServer(state: PlaybackState) {
  usePlayerStore.getState().applyPlaybackStateFromServer(state);
}

export function getPlaybackSocket(): Socket | null {
  return socket;
}

function hydrate() {
  if (!socket?.connected) return;

  socket.emit('query:get-state', {}, (payload: PlaybackState | null) => {
    if (payload) applyStateFromServer(payload);
  });
}

export function connectPlaybackSync(accessToken: string) {
  disconnectPlaybackSync();

  socket = createPlaybackSocket(accessToken);

  socket.on('connect', () => {
    hydrate();
  });

  socket.on('event:playback-state-updated', (state: PlaybackState) => {
    applyStateFromServer(state);
  });

  socket.on('connect_error', (err: Error) => {
    console.error('[playback] connect_error', err.message);
  });

  socket.on('exception', (err: unknown) => {
    console.error('[playback] exception', err);
  });
}

export function disconnectPlaybackSync() {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}

function isPlaybackSocketConnected(): boolean {
  return Boolean(socket?.connected);
}

/**
 * Push full snapshot to the server after local player mutations.
 * No-op if disconnected or there is no current track.
 */
export function afterLocalPlaybackMutation() {
  if (!isPlaybackSocketConnected()) return;

  const { currentTrack, playbackVersion } = usePlayerStore.getState();
  if (!currentTrack) return;

  const trackData = currentTrack;
  const state = buildSetStateBody(trackData);

  socket!.emit(
    'command:set-state',
    { state, expectedVersion: playbackVersion } satisfies SetPlaybackStateRequest,
    (result: PlaybackState) => {
      applyStateFromServer(result);
    },
  );
}

export function isPlaybackSyncConnected(): boolean {
  return isPlaybackSocketConnected();
}
