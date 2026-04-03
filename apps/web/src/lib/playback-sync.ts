import { getLocalPlaybackDeviceMetadata } from '@/lib/playback-device';
import { getOrderedNextQueue } from '@/lib/playback-queue';
import { createPlaybackSocket } from '@/lib/playback-socket';
import { usePlayerStore } from '@/stores/player-store/player.store';
import {
  PLAYBACK_HISTORY_MAX_LENGTH,
  type ListPlaybackDevicesResponse,
  type PlaybackState,
  type PlaybackTrack,
  type SetActiveDeviceRequest,
  type SetCurrentTimeStateRequest,
  type SetPlaybackStateRequest,
  type SetPlayingStateRequest,
} from '@repo/contracts';
import type { Socket } from 'socket.io-client';

let socket: Socket | null = null;

/** True while a `command:set-state` or `command:set-playing-state` round-trip is in flight. */
let writeInFlight = false;

/** Intent only: body is built from the live store in `flushWriteQueue` to avoid stale snapshots after server hydrate. */
type PendingFullStateIntent = { kind: 'full-state'; claimActiveDevice: boolean };

let pendingSetStateWrite: PendingFullStateIntent | null = null;

/** Lightweight play/pause sync when no full snapshot is already queued. */
type PendingPlayingStateIntent = { kind: 'playing-state'; claimActiveDevice: boolean };

let pendingPlayingWrite: PendingPlayingStateIntent | null = null;

let flushMicrotaskScheduled = false;

function isVersionConflict(errorMessage: string, code?: string): boolean {
  return (
    code === 'CONFLICT' ||
    errorMessage.includes('version mismatch') ||
    errorMessage.includes('Expected version mismatch')
  );
}

function clampCurrentTime(currentTime: number, duration: number): number {
  return Math.min(Math.max(0, Math.floor(currentTime)), duration);
}

/** Active audio client: keep local `currentTime` from the element; still advance `playbackVersion` from server. */
function isLocalActiveAudioSource(state: {
  activeDeviceId: string | null;
  localPlaybackDeviceId: string;
}): boolean {
  return (
    state.activeDeviceId != null &&
    state.activeDeviceId !== '' &&
    Boolean(state.localPlaybackDeviceId) &&
    state.activeDeviceId === state.localPlaybackDeviceId
  );
}

/**
 * Apply a time-only server update (broadcast or set-current-time ack).
 * Ignores stale `version`; does not overwrite `currentTime` on the device that is playing audio.
 */
function applyCurrentTimeServerUpdate(payload: { currentTime: number; version: number }) {
  const s = usePlayerStore.getState();
  if (payload.version < s.playbackVersion) return;

  if (isLocalActiveAudioSource(s)) {
    usePlayerStore.setState({ playbackVersion: payload.version });
  } else {
    usePlayerStore.setState({
      playbackVersion: payload.version,
      currentTime: payload.currentTime,
    });
  }
}

function buildSetStateBody(trackData: PlaybackTrack): SetPlaybackStateRequest['state'] {
  const s = usePlayerStore.getState();
  const queue = getOrderedNextQueue(s.queue, s.isShuffled).map((item, index) => ({
    ...item,
    position: index,
  }));
  return {
    devices: s.playbackDevices.map((d) => ({ id: d.id, name: d.name, icon: d.icon })),
    isPlaying: s.isPlaying,
    trackData,
    currentTime: Math.min(Math.max(0, Math.floor(s.currentTime)), trackData.duration),
    volume: Math.min(1, Math.max(0, s.volume)),
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
    applyCurrentTimeServerUpdate(payload);
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
  writeInFlight = false;
  pendingSetStateWrite = null;
  pendingPlayingWrite = null;
  flushMicrotaskScheduled = false;
}

function isPlaybackSocketConnected(): boolean {
  return Boolean(socket?.connected);
}

function scheduleFlushWriteQueue() {
  if (flushMicrotaskScheduled) return;
  flushMicrotaskScheduled = true;
  queueMicrotask(() => {
    flushMicrotaskScheduled = false;
    flushWriteQueue();
  });
}

/**
 * Queue a full snapshot (latest store wins). Clears a pending playing-only write.
 * @param schedule - when false, caller will call `flushWriteQueue()` immediately (e.g. after conflict hydrate).
 */
function mergeOrQueueFullSnapshot(claimActiveDevice: boolean, schedule = true) {
  const s = usePlayerStore.getState();
  if (!s.currentTrack) return;

  pendingPlayingWrite = null;
  const nextClaim = pendingSetStateWrite?.claimActiveDevice || claimActiveDevice;
  pendingSetStateWrite = { kind: 'full-state', claimActiveDevice: nextClaim };
  if (schedule) {
    scheduleFlushWriteQueue();
  }
}

function parseSyncAckError(result: unknown): { message: string; code?: string } | null {
  if (!result || typeof result !== 'object') return null;
  if (!('error' in result) || !result.error) return null;
  const message = String(result.error);
  const code =
    'code' in result && typeof (result as { code?: unknown }).code === 'string'
      ? (result as { code: string }).code
      : undefined;
  return { message, code };
}

function handleSyncWriteAck(
  result: PlaybackState | { error?: string; code?: string } | undefined,
  meta: { kind: 'set-state'; claim: boolean } | { kind: 'playing'; claim: boolean },
) {
  writeInFlight = false;

  const err = parseSyncAckError(result);
  if (err) {
    if (isVersionConflict(err.message, err.code)) {
      socket!.emit('query:get-state', {}, (state: PlaybackState | null) => {
        if (state) applyStateFromServer(state);
        mergeOrQueueFullSnapshot(meta.kind === 'set-state' ? meta.claim : meta.claim, false);
        flushWriteQueue();
      });
      return;
    }
    flushWriteQueue();
    return;
  }

  if (result) {
    applyStateFromServer(result as PlaybackState);
  }
  flushWriteQueue();
}

/**
 * Send the next queued mutation. Full `set-state` takes precedence over `set-playing-state`.
 */
function flushWriteQueue() {
  if (!isPlaybackSocketConnected() || writeInFlight) return;

  if (pendingSetStateWrite) {
    const job = pendingSetStateWrite;
    pendingSetStateWrite = null;

    const s = usePlayerStore.getState();
    if (!s.currentTrack) {
      flushWriteQueue();
      return;
    }

    writeInFlight = true;
    const state = buildSetStateBody(s.currentTrack);

    socket!.emit(
      'command:set-state',
      {
        state,
        expectedVersion: s.playbackVersion,
        claimActiveDevice: job.claimActiveDevice,
      } satisfies SetPlaybackStateRequest,
      (ack: PlaybackState | { error?: string; code?: string }) => {
        handleSyncWriteAck(ack, { kind: 'set-state', claim: job.claimActiveDevice });
      },
    );
    return;
  }

  if (pendingPlayingWrite) {
    const job = pendingPlayingWrite;
    pendingPlayingWrite = null;

    const s = usePlayerStore.getState();
    if (!s.currentTrack || s.playbackVersion === 0) {
      mergeOrQueueFullSnapshot(job.claimActiveDevice, false);
      flushWriteQueue();
      return;
    }

    writeInFlight = true;
    const payload: SetPlayingStateRequest = {
      isPlaying: s.isPlaying,
      expectedVersion: s.playbackVersion,
    };

    socket!.emit(
      'command:set-playing-state',
      payload,
      (ack: PlaybackState | { error?: string; code?: string }) => {
        handleSyncWriteAck(ack, { kind: 'playing', claim: job.claimActiveDevice });
      },
    );
  }
}

function requestSetStateWrite(claimActiveDevice: boolean) {
  if (!isPlaybackSocketConnected()) return;

  const { currentTrack } = usePlayerStore.getState();
  if (!currentTrack) return;

  mergeOrQueueFullSnapshot(claimActiveDevice);
}

/**
 * Sync play/pause with a targeted command when possible (smaller payload, fewer conflicts).
 * Falls back to a full snapshot when version is 0 or a write is already queued/in flight.
 */
export function syncPlayingStateToServer(claimActiveDevice: boolean) {
  if (!isPlaybackSocketConnected()) return;

  const s = usePlayerStore.getState();
  if (!s.currentTrack) return;

  if (s.playbackVersion === 0 || writeInFlight || pendingSetStateWrite !== null) {
    mergeOrQueueFullSnapshot(claimActiveDevice);
    return;
  }

  pendingPlayingWrite = { kind: 'playing-state', claimActiveDevice };
  scheduleFlushWriteQueue();
}

export function afterLocalPlaybackMutation() {
  requestSetStateWrite(false);
}

export function afterLocalPlaybackMutationWithClaim(claimActiveDevice: boolean) {
  requestSetStateWrite(claimActiveDevice);
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
        const err = parseSyncAckError(result);
        if (err) {
          if (isVersionConflict(err.message, err.code)) {
            socket!.emit('query:get-state', {}, (state: PlaybackState | null) => {
              if (state) applyStateFromServer(state);
            });
          }
          resolve();
          return;
        }

        if (result) {
          const state = result as PlaybackState;
          applyCurrentTimeServerUpdate({
            currentTime: state.currentTime,
            version: state.version,
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
      (result: PlaybackState | { error?: string; code?: string }) => {
        const err = parseSyncAckError(result);
        if (err) {
          if (isVersionConflict(err.message, err.code)) {
            socket!.emit('query:get-state', {}, (state: PlaybackState | null) => {
              if (state) applyStateFromServer(state);
            });
          }
          resolve();
          return;
        }
        if (result) {
          applyStateFromServer(result as PlaybackState);
          void listPlaybackDevices();
        }
        resolve();
      },
    );
  });
}

export function isPlaybackSyncConnected(): boolean {
  return isPlaybackSocketConnected();
}
