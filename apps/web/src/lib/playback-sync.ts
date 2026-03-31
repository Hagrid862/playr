import { getLocalPlaybackDeviceMetadata } from '@/lib/playback-device';
import { zodTrackToPlaybackTrack } from '@/lib/playback-mappers';
import { createPlaybackSocket } from '@/lib/playback-socket';
import { usePlayerStore } from '@/stores/player.store';
import type {
  ListPlaybackDevicesResponse,
  PlaybackState,
  SetActiveDeviceRequest,
  SetCurrentTimeStateRequest,
  SetPlaybackStateRequest,
} from '@repo/contracts';
import type { Socket } from 'socket.io-client';

let socket: Socket | null = null;

function isVersionConflict(errorMessage: string, code?: string): boolean {
  return code === 'CONFLICT' || errorMessage.includes('version mismatch');
}

function clampCurrentTime(currentTime: number, duration: number): number {
  return Math.min(Math.max(0, Math.floor(currentTime)), duration);
}

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
  const localDevice = getLocalPlaybackDeviceMetadata();
  usePlayerStore.getState().setLocalPlaybackDeviceId(localDevice.playbackDeviceId);

  socket = createPlaybackSocket({
    accessToken,
    playbackDeviceId: localDevice.playbackDeviceId,
    deviceName: localDevice.deviceName,
    deviceIcon: localDevice.deviceIcon,
  });

  socket.on('connect', () => {
    hydrate();
    void listPlaybackDevices();
  });

  socket.on('event:playback-state-updated', (state: PlaybackState) => {
    applyStateFromServer(state);
  });

  socket.on('event:current-time-updated', (payload: { currentTime: number; version: number }) => {
    // Time-only update: avoid reapplying the full server snapshot on every tick.
    usePlayerStore.setState({
      playbackVersion: payload.version,
      currentTime: payload.currentTime,
    });
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
    {
      state,
      expectedVersion: playbackVersion,
      claimActiveDevice: false,
    } satisfies SetPlaybackStateRequest,
    (result: PlaybackState) => {
      applyStateFromServer(result);
    },
  );
}

export function afterLocalPlaybackMutationWithClaim(claimActiveDevice: boolean) {
  if (!isPlaybackSocketConnected()) return;

  const { currentTrack, playbackVersion } = usePlayerStore.getState();
  if (!currentTrack) return;

  const trackData = currentTrack;
  const state = buildSetStateBody(trackData);

  socket!.emit(
    'command:set-state',
    {
      state,
      expectedVersion: playbackVersion,
      claimActiveDevice,
    } satisfies SetPlaybackStateRequest,
    (result: PlaybackState) => {
      applyStateFromServer(result);
    },
  );
}

export function listPlaybackDevices(): Promise<void> {
  if (!isPlaybackSocketConnected()) return Promise.resolve();

  return new Promise((resolve) => {
    socket!.emit('query:list-devices', {}, (result: ListPlaybackDevicesResponse) => {
      usePlayerStore.getState().setPlaybackDevices(result.devices);
      resolve();
    });
  });
}

export function emitCurrentTimeSync(currentTime: number): Promise<void> {
  if (!isPlaybackSocketConnected()) return Promise.resolve();

  const { currentTrack, playbackVersion } = usePlayerStore.getState();
  if (!currentTrack || playbackVersion === 0) return Promise.resolve();

  const payload: SetCurrentTimeStateRequest = {
    currentTime: clampCurrentTime(currentTime, currentTrack.duration),
    expectedVersion: playbackVersion,
  };

  return new Promise((resolve) => {
    socket!.emit(
      'command:set-current-time-state',
      payload,
      (result: PlaybackState | { error?: string; code?: string }) => {
        if (result && typeof result === 'object' && 'error' in result && result.error) {
          if (isVersionConflict(result.error, result.code)) {
            socket!.emit('query:get-state', {}, (state: PlaybackState | null) => {
              if (state) applyStateFromServer(state);
            });
          }
          resolve();
          return;
        }

        if (result) {
          // Ack for `command:set-current-time-state` only mutates `currentTime`;
          // avoid reapplying the full snapshot on every time tick.
          const state = result as PlaybackState;
          usePlayerStore.setState({
            playbackVersion: state.version,
            currentTime: state.currentTime,
          });
        }
        resolve();
      },
    );
  });
}

export function setActivePlaybackDevice(deviceId: string): Promise<void> {
  if (!isPlaybackSocketConnected()) return Promise.resolve();
  const { playbackVersion } = usePlayerStore.getState();
  if (!playbackVersion) return Promise.resolve();

  return new Promise((resolve) => {
    socket!.emit(
      'command:set-active-device',
      {
        deviceId,
        expectedVersion: playbackVersion,
      } satisfies SetActiveDeviceRequest,
      (result: PlaybackState) => {
        applyStateFromServer(result);
        void listPlaybackDevices();
        resolve();
      },
    );
  });
}

export function isPlaybackSyncConnected(): boolean {
  return isPlaybackSocketConnected();
}
