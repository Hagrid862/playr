import { createPlayerStateMock } from '@/components/app/test-utils/player-test-utils';
import type { PlayerState } from '@/stores/player-store/player.store';
import type { ListPlaybackDevicesResponse, PlaybackState, PlaybackTrack } from '@repo/contracts';
import type { Socket } from 'socket.io-client';
import { vi } from 'vitest';

type SocketOnCall = [event: string, handler: (...args: unknown[]) => void];
type SocketEmitAckCall = [event: string, data: unknown, ack: (...args: unknown[]) => void];

function isSocketOnCall(row: unknown): row is SocketOnCall {
  return (
    Array.isArray(row) &&
    row.length >= 2 &&
    typeof row[0] === 'string' &&
    typeof row[1] === 'function'
  );
}

function isSocketEmitAckCall(row: unknown): row is SocketEmitAckCall {
  return (
    Array.isArray(row) &&
    row.length >= 3 &&
    typeof row[0] === 'string' &&
    typeof row[2] === 'function'
  );
}

export function findOnHandler(calls: unknown[], event: string): (...args: unknown[]) => void {
  const row = calls.find((c): c is SocketOnCall => isSocketOnCall(c) && c[0] === event);
  if (!row) throw new Error(`on('${event}') not registered`);
  return row[1];
}

export function findEmitAck(calls: unknown[], event: string): (...args: unknown[]) => void {
  const row = calls.find((c): c is SocketEmitAckCall => isSocketEmitAckCall(c) && c[0] === event);
  if (!row) throw new Error(`emit('${event}', ..., ack) not found`);
  return row[2];
}

export async function flushMicrotasks() {
  for (let i = 0; i < 3; i++) {
    await Promise.resolve();
  }
}

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

/** Minimal valid `PlaybackState` for socket/server payload stubs in tests. */
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

export type PlaybackSocketMock = {
  on: ReturnType<typeof vi.fn>;
  emit: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  removeAllListeners: ReturnType<typeof vi.fn>;
  connected: boolean;
};

export type EmitCallbackPayload =
  | PlaybackState
  | ListPlaybackDevicesResponse
  | { error?: string; code?: string; currentTime?: number; version?: number }
  | null;

export function createPlaybackSocketMock(): PlaybackSocketMock {
  return {
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    removeAllListeners: vi.fn(),
    connected: true,
  };
}

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

/** Test double: only `createPlaybackSocket`’s usage is exercised; full `Socket` is not implemented. */
export function asSocketMock(mock: PlaybackSocketMock): Socket {
  return mock as unknown as Socket;
}
