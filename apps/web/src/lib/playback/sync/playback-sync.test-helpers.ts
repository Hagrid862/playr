import { createPlayerStateMock } from '@/components/app/test-utils/player-test-utils';
import type { PlayerState } from '@/stores/player-store/player.store';
import type { ListPlaybackDevicesResponse, PlaybackState, PlaybackTrack } from '@repo/contracts';
import type { Socket } from 'socket.io-client';
import { type Mock, vi } from 'vitest';

type PlaybackSocketOnFn = (event: string, listener: (...args: unknown[]) => void) => void;
/**
 * Emit mock: rest must stay loose so `mockImplementation` can use typed ack parameters.
 * `unknown[]` is rejected under strict function checking (contravariance vs. real emit stubs).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PlaybackSocketEmitFn = (event: string, ...args: any[]) => unknown;
type PlaybackSocketOnceFn = (event: string, handler: (...args: unknown[]) => void) => void;
type PlaybackSocketOffFn = (event: string, handler?: (...args: unknown[]) => void) => void;

type SocketOnCall = [event: string, handler: (...args: unknown[]) => void];
type SocketEmitAckCall = [event: string, data: unknown, ack: (...args: unknown[]) => void];

/**
 * Check if the row is a socket on call.
 * @param row - The row to check.
 * @returns True if the row is a socket on call, false otherwise.
 */
function isSocketOnCall(row: unknown): row is SocketOnCall {
  return (
    Array.isArray(row) &&
    row.length >= 2 &&
    typeof row[0] === 'string' &&
    typeof row[1] === 'function'
  );
}

/**
 * Check if the row is a socket emit ack call.
 * @param row - The row to check.
 * @returns True if the row is a socket emit ack call, false otherwise.
 */
function isSocketEmitAckCall(row: unknown): row is SocketEmitAckCall {
  return (
    Array.isArray(row) &&
    row.length >= 3 &&
    typeof row[0] === 'string' &&
    typeof row[2] === 'function'
  );
}

/**
 * Find the on handler.
 * @param calls - The calls to search.
 * @param event - The event to find.
 * @returns The on handler.
 */
export function findOnHandler(calls: unknown[], event: string): (...args: unknown[]) => void {
  const row = calls.find((c): c is SocketOnCall => isSocketOnCall(c) && c[0] === event);
  if (!row) throw new Error(`on('${event}') not registered`);
  return row[1];
}

/**
 * Find the emit ack.
 * @param calls - The calls to search.
 * @param event - The event to find.
 * @returns The emit ack.
 */
export function findEmitAck(calls: unknown[], event: string): (...args: unknown[]) => void {
  const row = calls.find((c): c is SocketEmitAckCall => isSocketEmitAckCall(c) && c[0] === event);
  if (!row) throw new Error(`emit('${event}', ..., ack) not found`);
  return row[2];
}

/**
 * Flush microtasks.
 * @returns A promise that resolves when the microtasks are flushed.
 */
export async function flushMicrotasks() {
  for (let i = 0; i < 3; i++) {
    await Promise.resolve();
  }
}

/**
 * Create a playback track stub.
 * @param id - The id of the track.
 * @param duration - The duration of the track.
 * @returns The playback track stub.
 */
export function playbackTrackStub(id: string, duration = 100): PlaybackTrack {
  return {
    id,
    title: 'T',
    trackId: id,
    artists: [],
    albumName: 'A',
    albumId: 'aid',
    albumArt: null,
    duration,
    explicit: false,
  };
}

/**
 * Create a playback state fixture.
 * @param overrides - The overrides to apply to the base state.
 * @returns The playback state fixture.
 */
export function playbackStateFixture(overrides: Partial<PlaybackState> = {}): PlaybackState {
  const base: PlaybackState = {
    userId: 'test-user',
    activeDeviceId: null,
    devices: [],
    isPlaying: false,
    trackData: playbackTrackStub('fixture-track'),
    currentTime: 0,
    queue: [],
    history: [],
    volume: 0.5,
    repeatMode: 'off',
    shuffle: false,
    favorited: 'not-set',
    inLibrary: false,
    version: 0,
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
  return { ...base, ...overrides };
}

/**
 * Playback socket mock.
 * @returns The playback socket mock.
 */
export type PlaybackSocketMock = {
  on: Mock<PlaybackSocketOnFn>;
  emit: Mock<PlaybackSocketEmitFn>;
  once: Mock<PlaybackSocketOnceFn>;
  off: Mock<PlaybackSocketOffFn>;
  disconnect: Mock<() => void>;
  removeAllListeners: Mock<() => void>;
  connected: boolean;
  /** Invokes handlers registered with once('disconnect', …) (for emitWithAck tests). */
  simulateDisconnect: () => void;
};

/**
 * Emit callback payload.
 * @returns The emit callback payload.
 */
export type EmitCallbackPayload =
  | PlaybackState
  | ListPlaybackDevicesResponse
  | { error?: string; code?: string; currentTime?: number; version?: number }
  | null;

/**
 * Create a playback socket mock.
 * @returns The playback socket mock.
 */
export function createPlaybackSocketMock(): PlaybackSocketMock {
  const disconnectOnceHandlers: Array<(...args: unknown[]) => void> = [];

  const once: Mock<PlaybackSocketOnceFn> = vi.fn(
    (event: string, handler: (...args: unknown[]) => void) => {
      if (event === 'disconnect') {
        disconnectOnceHandlers.push(handler);
      }
    },
  );

  const off: Mock<PlaybackSocketOffFn> = vi.fn(
    (event: string, handler?: (...args: unknown[]) => void) => {
      if (event === 'disconnect' && handler) {
        const i = disconnectOnceHandlers.indexOf(handler);
        if (i >= 0) disconnectOnceHandlers.splice(i, 1);
      }
    },
  );

  const simulateDisconnect = () => {
    const pending = [...disconnectOnceHandlers];
    disconnectOnceHandlers.length = 0;
    for (const h of pending) {
      h();
    }
  };

  const on: Mock<PlaybackSocketOnFn> = vi.fn();
  const emit: Mock<PlaybackSocketEmitFn> = vi.fn();
  const disconnect: Mock<() => void> = vi.fn();
  const removeAllListeners: Mock<() => void> = vi.fn();

  return {
    on,
    emit,
    once,
    off,
    disconnect,
    removeAllListeners,
    connected: true,
    simulateDisconnect,
  };
}

/**
 * Base playback sync test state.
 * @returns The base playback sync test state.
 */
export const basePlaybackSyncTestState: PlayerState = createPlayerStateMock({
  currentTrack: playbackTrackStub('track-1'),
  playbackVersion: 1,
  isPlaying: true,
  currentTime: 10,
  volume: 0.5,
  repeatMode: 'off',
  isShuffled: false,
  queue: [],
  playbackFavorited: 'not-set',
  playbackInLibrary: false,
});

/**
 * As socket mock.
 * @param mock - The mock to convert to a socket mock.
 * @returns The socket mock.
 */
function socketFromUnknown(value: unknown): Socket {
  return value as Socket;
}

export function asSocketMock(mock: PlaybackSocketMock): Socket {
  return socketFromUnknown(mock);
}
