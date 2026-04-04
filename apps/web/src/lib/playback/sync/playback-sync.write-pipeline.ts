import { usePlayerStore } from '@/stores/player-store/player.store';
import type {
  PlaybackState,
  SetPlaybackStateRequest,
  SetPlayingStateRequest,
} from '@repo/contracts';
import {
  getFlushMicrotaskScheduled,
  getPendingPlayingWrite,
  getPendingSetStateWrite,
  getSocket,
  getWriteInFlight,
  isPlaybackSocketConnected,
  setFlushMicrotaskScheduled,
  setPendingPlayingWrite,
  setPendingSetStateWrite,
  setWriteInFlight,
} from './playback-sync.state';
import { applyStateFromServer, buildSetStateBody } from './playback-sync.store-bridge';
import {
  isPlaybackStateSyncAck,
  isVersionConflict,
  parseSyncAckError,
} from './playback-sync.utils';

export function scheduleFlushWriteQueue() {
  if (getFlushMicrotaskScheduled()) return;
  setFlushMicrotaskScheduled(true);
  queueMicrotask(() => {
    setFlushMicrotaskScheduled(false);
    flushWriteQueue();
  });
}

/**
 * Queue a full snapshot (latest store wins). Clears a pending playing-only write.
 * @param schedule - when false, caller will call `flushWriteQueue()` immediately (e.g. after conflict hydrate).
 */
export function mergeOrQueueFullSnapshot(claimActiveDevice: boolean, schedule = true) {
  const s = usePlayerStore.getState();
  if (!s.currentTrack) return;

  setPendingPlayingWrite(null);
  const pending = getPendingSetStateWrite();
  const nextClaim = pending?.claimActiveDevice || claimActiveDevice;
  setPendingSetStateWrite({ kind: 'full-state', claimActiveDevice: nextClaim });
  if (schedule) {
    scheduleFlushWriteQueue();
  }
}

export function handleSyncWriteAck(
  result: PlaybackState | { error?: string; code?: string } | undefined,
  meta: { kind: 'set-state'; claim: boolean } | { kind: 'playing'; claim: boolean },
) {
  setWriteInFlight(false);

  const err = parseSyncAckError(result);
  if (err) {
    if (isVersionConflict(err.message, err.code)) {
      getSocket()!.emit('query:get-state', {}, (state: PlaybackState | null) => {
        if (state) applyStateFromServer(state);
        mergeOrQueueFullSnapshot(meta.claim, false);
        flushWriteQueue();
      });
      return;
    }
    flushWriteQueue();
    return;
  }

  if (isPlaybackStateSyncAck(result)) {
    applyStateFromServer(result);
  }
  flushWriteQueue();
}

/**
 * Send the next queued mutation. Full `set-state` takes precedence over `set-playing-state`.
 */
export function flushWriteQueue() {
  if (!isPlaybackSocketConnected() || getWriteInFlight()) return;

  const pendingFull = getPendingSetStateWrite();
  if (pendingFull) {
    const job = pendingFull;
    setPendingSetStateWrite(null);

    const s = usePlayerStore.getState();
    if (!s.currentTrack) {
      flushWriteQueue();
      return;
    }

    setWriteInFlight(true);
    const state = buildSetStateBody(s.currentTrack);

    getSocket()!.emit(
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

  const pendingPlaying = getPendingPlayingWrite();
  if (pendingPlaying) {
    const job = pendingPlaying;
    setPendingPlayingWrite(null);

    const s = usePlayerStore.getState();
    if (!s.currentTrack || s.playbackVersion === 0) {
      mergeOrQueueFullSnapshot(job.claimActiveDevice, false);
      flushWriteQueue();
      return;
    }

    setWriteInFlight(true);
    const payload: SetPlayingStateRequest = {
      isPlaying: s.isPlaying,
      expectedVersion: s.playbackVersion,
    };

    getSocket()!.emit(
      'command:set-playing-state',
      payload,
      (ack: PlaybackState | { error?: string; code?: string }) => {
        handleSyncWriteAck(ack, { kind: 'playing', claim: job.claimActiveDevice });
      },
    );
  }
}

export function requestSetStateWrite(claimActiveDevice: boolean) {
  if (!isPlaybackSocketConnected()) return;

  const { currentTrack } = usePlayerStore.getState();
  if (!currentTrack) return;

  mergeOrQueueFullSnapshot(claimActiveDevice);
}
