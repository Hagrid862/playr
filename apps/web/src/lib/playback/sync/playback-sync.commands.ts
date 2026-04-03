import { usePlayerStore } from '@/stores/player-store/player.store';
import type {
  ListPlaybackDevicesResponse,
  PlaybackState,
  SetActiveDeviceRequest,
  SetCurrentTimeStateRequest,
} from '@repo/contracts';
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

export function listPlaybackDevices(): Promise<void> {
  if (!isPlaybackSocketConnected()) return Promise.resolve();

  return new Promise((resolve) => {
    getSocket()!.emit('query:list-devices', {}, (result: ListPlaybackDevicesResponse) => {
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
    getSocket()!.emit(
      'command:set-current-time-state',
      payload,
      (result: PlaybackState | { error?: string; code?: string }) => {
        const err = parseSyncAckError(result);
        if (err) {
          if (isVersionConflict(err.message, err.code)) {
            getSocket()!.emit('query:get-state', {}, (state: PlaybackState | null) => {
              if (state) applyStateFromServer(state);
            });
          }
          resolve();
          return;
        }

        if (isPlaybackStateSyncAck(result)) {
          applyCurrentTimeServerUpdate({
            currentTime: result.currentTime,
            version: result.version,
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
    getSocket()!.emit(
      'command:set-active-device',
      {
        deviceId,
        expectedVersion: playbackVersion,
      } satisfies SetActiveDeviceRequest,
      (result: PlaybackState | { error?: string; code?: string }) => {
        const err = parseSyncAckError(result);
        if (err) {
          if (isVersionConflict(err.message, err.code)) {
            getSocket()!.emit('query:get-state', {}, (state: PlaybackState | null) => {
              if (state) applyStateFromServer(state);
            });
          }
          resolve();
          return;
        }
        if (isPlaybackStateSyncAck(result)) {
          applyStateFromServer(result);
          void listPlaybackDevices();
        }
        resolve();
      },
    );
  });
}
