import { usePlayerStore } from '@/stores/player-store/player.store';
import type {
  ListPlaybackDevicesResponse,
  PlaybackState,
  PresenceTouchResponse,
  SetActiveDeviceRequest,
  SetCurrentTimeStateRequest,
} from '@repo/contracts';
import { emitWithAck, PLAYBACK_SOCKET_ACK_TIMEOUT_MS } from './playback-sync.emit-with-ack';
import { firePlaybackCommand } from './playback-sync.fire-and-forget';
import {
  getPendingSetStateWrite,
  getSocket,
  getWriteInFlight,
  isPlaybackSocketConnected,
  setPendingPlayingWrite,
} from './playback-sync.state';
import { applyCurrentTimeServerUpdate, applyStateFromServer } from './playback-sync.store-bridge';
import {
  clampCurrentTime,
  isPlaybackStateSyncAck,
  isVersionConflict,
  parseSyncAckError,
} from './playback-sync.utils';
import {
  mergeOrQueueFullSnapshot,
  requestSetStateWrite,
  scheduleFlushWriteQueue,
} from './playback-sync.write-pipeline';

/**
 * Sync play/pause with a targeted command when possible (smaller payload, fewer conflicts).
 * Falls back to a full snapshot when version is 0 or a write is already queued/in flight.
 */
export function syncPlayingStateToServer(claimActiveDevice: boolean) {
  if (!isPlaybackSocketConnected()) return;

  const s = usePlayerStore.getState();
  if (!s.currentTrack) return;

  if (s.playbackVersion === 0 || getWriteInFlight() || getPendingSetStateWrite() !== null) {
    mergeOrQueueFullSnapshot(claimActiveDevice);
    return;
  }

  setPendingPlayingWrite({ kind: 'playing-state', claimActiveDevice });
  scheduleFlushWriteQueue();
}

export function afterLocalPlaybackMutation() {
  requestSetStateWrite(false);
}

export function afterLocalPlaybackMutationWithClaim(claimActiveDevice: boolean) {
  requestSetStateWrite(claimActiveDevice);
}

export function listPlaybackDevices(
  ackTimeoutMs: number = PLAYBACK_SOCKET_ACK_TIMEOUT_MS,
): Promise<void> {
  if (!isPlaybackSocketConnected()) return Promise.resolve();

  const socket = getSocket()!;
  return emitWithAck<ListPlaybackDevicesResponse>(
    socket,
    'query:list-devices',
    {},
    ackTimeoutMs,
  ).then((result) => {
    usePlayerStore.getState().setPlaybackDevices(result.devices);
  });
}

/**
 * Refreshes playback device presence in Redis. The API uses a 90s TTL on the device hash;
 * the client heartbeat interval must stay comfortably below that (see playback-sync.connection).
 */
export async function emitPresenceTouch(
  ackTimeoutMs: number = PLAYBACK_SOCKET_ACK_TIMEOUT_MS,
): Promise<void> {
  if (!isPlaybackSocketConnected()) return;

  const socket = getSocket()!;
  await emitWithAck<PresenceTouchResponse>(socket, 'command:presence-touch', {}, ackTimeoutMs);
}

export async function emitCurrentTimeSync(
  currentTime: number,
  ackTimeoutMs: number = PLAYBACK_SOCKET_ACK_TIMEOUT_MS,
): Promise<void> {
  if (!isPlaybackSocketConnected()) return;

  const { currentTrack, playbackVersion } = usePlayerStore.getState();
  if (!currentTrack || playbackVersion === 0) return;

  const payload: SetCurrentTimeStateRequest = {
    currentTime: clampCurrentTime(currentTime, currentTrack.duration),
    expectedVersion: playbackVersion,
  };

  const socket = getSocket()!;
  const result = await emitWithAck<PlaybackState | { error?: string; code?: string }>(
    socket,
    'command:set-current-time-state',
    payload,
    ackTimeoutMs,
  );

  const err = parseSyncAckError(result);
  if (err) {
    if (isVersionConflict(err.message, err.code)) {
      const state = await emitWithAck<PlaybackState | null>(
        socket,
        'query:get-state',
        {},
        ackTimeoutMs,
      );
      if (state) {
        applyStateFromServer(state);
      } else {
        usePlayerStore.getState().clearSessionPlayback();
      }
    }
    return;
  }

  if (isPlaybackStateSyncAck(result)) {
    applyCurrentTimeServerUpdate({
      currentTime: result.currentTime,
      version: result.version,
    });
  }
}

export async function setActivePlaybackDevice(
  deviceId: string,
  ackTimeoutMs: number = PLAYBACK_SOCKET_ACK_TIMEOUT_MS,
): Promise<void> {
  if (!isPlaybackSocketConnected()) return;
  const { playbackVersion } = usePlayerStore.getState();
  if (!playbackVersion) return;

  const originalDeviceId = deviceId;
  const socket = getSocket()!;

  const result = await emitWithAck<PlaybackState | { error?: string; code?: string }>(
    socket,
    'command:set-active-device',
    {
      deviceId: originalDeviceId,
      expectedVersion: playbackVersion,
    } satisfies SetActiveDeviceRequest,
    ackTimeoutMs,
  );

  const err = parseSyncAckError(result);
  if (err) {
    if (!isVersionConflict(err.message, err.code)) return;

    const state = await emitWithAck<PlaybackState | null>(
      socket,
      'query:get-state',
      {},
      ackTimeoutMs,
    );
    if (!state) {
      usePlayerStore.getState().clearSessionPlayback();
      return;
    }

    applyStateFromServer(state);
    const sock = getSocket();
    if (!sock) return;

    const expectedVersion = usePlayerStore.getState().playbackVersion;
    const retryResult = await emitWithAck<PlaybackState | { error?: string; code?: string }>(
      sock,
      'command:set-active-device',
      {
        deviceId: originalDeviceId,
        expectedVersion,
      } satisfies SetActiveDeviceRequest,
      ackTimeoutMs,
    );

    const retryErr = parseSyncAckError(retryResult);
    if (!retryErr && isPlaybackStateSyncAck(retryResult)) {
      applyStateFromServer(retryResult);
      firePlaybackCommand(listPlaybackDevices(ackTimeoutMs), 'listPlaybackDevices');
    }
    return;
  }

  if (isPlaybackStateSyncAck(result)) {
    applyStateFromServer(result);
    firePlaybackCommand(listPlaybackDevices(ackTimeoutMs), 'listPlaybackDevices');
  }
}
