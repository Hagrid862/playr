import { createPlayerStateMock } from '@/components/app/test-utils/player-test-utils';
import type { PlayerState } from '@/stores/player.store';
import { usePlayerStore } from '@/stores/player.store';
import { testQueueItem } from '@/test-utils/queue-test-fixtures';
import type {
  ListPlaybackDeviceEntry,
  ListPlaybackDevicesResponse,
  PlaybackState,
  PlaybackTrack,
  QueueItem,
} from '@repo/contracts';
import type { Socket } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPlaybackSocket } from './playback-socket';
import {
  afterLocalPlaybackMutation,
  afterLocalPlaybackMutationWithClaim,
  connectPlaybackSync,
  disconnectPlaybackSync,
  emitCurrentTimeSync,
  getPlaybackSocket,
  isPlaybackSyncConnected,
  listPlaybackDevices,
  setActivePlaybackDevice,
  syncPlayingStateToServer,
} from './playback-sync';

type SocketOnCall = [event: string, handler: (...args: unknown[]) => void];
type SocketEmitCall = [event: string, data?: unknown, ack?: (...args: unknown[]) => void];

function findOnHandler(calls: unknown[], event: string): (...args: unknown[]) => void {
  const row = (calls as SocketOnCall[]).find((c) => c[0] === event);
  if (!row) throw new Error(`on('${event}') not registered`);
  return row[1];
}

function findEmitAck(calls: unknown[], event: string): (...args: unknown[]) => void {
  const row = (calls as SocketEmitCall[]).find((c) => c[0] === event);
  if (!row?.[2]) throw new Error(`emit('${event}', ..., ack) not found`);
  return row[2] as (...args: unknown[]) => void;
}

async function flushMicrotasks() {
  await Promise.resolve();
}

function playbackTrackStub(id: string, duration = 100): PlaybackTrack {
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

type PlaybackSocketMock = {
  on: ReturnType<typeof vi.fn>;
  emit: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  removeAllListeners: ReturnType<typeof vi.fn>;
  connected: boolean;
};

type EmitCallbackPayload =
  | PlaybackState
  | ListPlaybackDevicesResponse
  | { error?: string; code?: string; currentTime?: number; version?: number }
  | null;

vi.mock('./playback-socket', () => ({
  createPlaybackSocket: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    removeAllListeners: vi.fn(),
    connected: true,
  })),
}));

vi.mock('./playback-device', () => ({
  getLocalPlaybackDeviceMetadata: vi.fn(() => ({
    playbackDeviceId: 'device-1',
    deviceName: 'Web',
    deviceIcon: 'desktop',
  })),
}));

vi.mock('@/stores/player.store', () => ({
  usePlayerStore: {
    getState: vi.fn(),
    setState: vi.fn(),
  },
}));

const baseState: PlayerState = createPlayerStateMock({
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

describe('playback-sync', () => {
  let mockSocket: PlaybackSocketMock;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket = {
      on: vi.fn(),
      emit: vi.fn(),
      disconnect: vi.fn(),
      removeAllListeners: vi.fn(),
      connected: true,
    };
    vi.mocked(createPlaybackSocket).mockReturnValue(mockSocket as unknown as Socket);
    vi.mocked(usePlayerStore.getState).mockReturnValue({ ...baseState });
  });

  afterEach(() => {
    disconnectPlaybackSync();
  });

  describe('connectPlaybackSync', () => {
    it('initializes socket and registers listeners', () => {
      connectPlaybackSync('token');

      expect(createPlaybackSocket).toHaveBeenCalled();
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith(
        'event:playback-state-updated',
        expect.any(Function),
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        'event:current-time-updated',
        expect.any(Function),
      );
      expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('exception', expect.any(Function));
    });

    it('hydrates state on connect', () => {
      connectPlaybackSync('token');
      const connectHandler = findOnHandler(mockSocket.on.mock.calls, 'connect');

      connectHandler();

      expect(mockSocket.emit).toHaveBeenCalledWith('query:get-state', {}, expect.any(Function));
      const hydrateAck = findEmitAck(mockSocket.emit.mock.calls, 'query:get-state');
      hydrateAck({ version: 1 } as unknown as PlaybackState);
      expect(usePlayerStore.getState().applyPlaybackStateFromServer).toHaveBeenCalled();

      expect(mockSocket.emit).toHaveBeenCalledWith('query:list-devices', {}, expect.any(Function));
    });

    it('applies state from server on update event', () => {
      connectPlaybackSync('token');
      const updateHandler = findOnHandler(mockSocket.on.mock.calls, 'event:playback-state-updated');

      const newState = { version: 2 } as unknown as PlaybackState;
      updateHandler(newState);

      expect(usePlayerStore.getState().applyPlaybackStateFromServer).toHaveBeenCalledWith(newState);
    });

    it('applies current time update from server', () => {
      connectPlaybackSync('token');
      const timeHandler = findOnHandler(mockSocket.on.mock.calls, 'event:current-time-updated');

      // Case: Remote update - should apply both version and time
      vi.mocked(usePlayerStore.getState).mockReturnValue(
        createPlayerStateMock({
          ...baseState,
          playbackVersion: 1,
          activeDeviceId: 'other-device',
          localPlaybackDeviceId: 'this-device',
        }),
      );

      timeHandler({ currentTime: 20, version: 2 });
      expect(usePlayerStore.setState).toHaveBeenCalledWith({
        playbackVersion: 2,
        currentTime: 20,
      });

      // Case: Stale update - should do nothing
      vi.mocked(usePlayerStore.getState).mockReturnValue(
        createPlayerStateMock({
          ...baseState,
          playbackVersion: 5,
          activeDeviceId: 'other-device',
          localPlaybackDeviceId: 'this-device',
        }),
      );
      timeHandler({ currentTime: 20, version: 2 });
      expect(usePlayerStore.setState).toHaveBeenCalledTimes(1);

      // Case: Local update (active device) - should only update version
      vi.mocked(usePlayerStore.getState).mockReturnValue(
        createPlayerStateMock({
          ...baseState,
          playbackVersion: 1,
          activeDeviceId: 'this-device',
          localPlaybackDeviceId: 'this-device',
        }),
      );

      timeHandler({ currentTime: 20, version: 2 });
      expect(usePlayerStore.setState).toHaveBeenCalledWith({
        playbackVersion: 2,
      });
    });

    it('handles connect errors and exceptions', () => {
      connectPlaybackSync('token');
      const errorHandler = findOnHandler(mockSocket.on.mock.calls, 'connect_error');
      const exceptionHandler = findOnHandler(mockSocket.on.mock.calls, 'exception');

      const spyConsole = vi.spyOn(console, 'error').mockImplementation(() => {});
      errorHandler({ message: 'fail' });
      exceptionHandler('big fail');
      expect(spyConsole).toHaveBeenCalledTimes(2);
      spyConsole.mockRestore();
    });
  });

  describe('afterLocalPlaybackMutation', () => {
    it('does nothing if socket is not connected', () => {
      afterLocalPlaybackMutation();
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it('emits set-state if connected and track exists', async () => {
      connectPlaybackSync('token');
      afterLocalPlaybackMutation();
      await flushMicrotasks();

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'command:set-state',
        expect.objectContaining({ claimActiveDevice: false }),
        expect.any(Function),
      );
    });

    it('handles set-state response', async () => {
      connectPlaybackSync('token');
      afterLocalPlaybackMutation();
      await flushMicrotasks();
      const ack = findEmitAck(mockSocket.emit.mock.calls, 'command:set-state');

      const newState = { version: 3 } as unknown as PlaybackState;
      ack(newState);
      expect(usePlayerStore.getState().applyPlaybackStateFromServer).toHaveBeenCalledWith(newState);
    });

    it('with claim: emits set-state with claimActiveDevice true and handles response', async () => {
      connectPlaybackSync('token');
      afterLocalPlaybackMutationWithClaim(true);
      await flushMicrotasks();

      const ack = findEmitAck(mockSocket.emit.mock.calls, 'command:set-state');
      ack({ version: 10 } as unknown as PlaybackState);
      expect(usePlayerStore.getState().applyPlaybackStateFromServer).toHaveBeenCalledWith({
        version: 10,
      });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'command:set-state',
        expect.objectContaining({ claimActiveDevice: true }),
        expect.any(Function),
      );
    });

    it('on set-state version conflict hydrates and retries with fresh snapshot', async () => {
      connectPlaybackSync('token');
      afterLocalPlaybackMutation();
      await flushMicrotasks();

      const setStateAck = findEmitAck(mockSocket.emit.mock.calls, 'command:set-state');
      mockSocket.emit.mockImplementation(
        (event: string, _data: unknown, callback?: (r: EmitCallbackPayload) => void) => {
          if (!callback) return;
          if (event === 'query:get-state') {
            callback({ version: 7 } as unknown as PlaybackState);
            return;
          }
          if (event === 'command:set-state') {
            callback({ version: 8 } as unknown as PlaybackState);
          }
        },
      );

      setStateAck({ error: 'Expected version mismatch.', code: 'CONFLICT' });
      await flushMicrotasks();

      expect(mockSocket.emit).toHaveBeenCalledWith('query:get-state', {}, expect.any(Function));
      expect(usePlayerStore.getState().applyPlaybackStateFromServer).toHaveBeenLastCalledWith(
        expect.objectContaining({ version: 8 }),
      );
    });
  });

  describe('syncPlayingStateToServer', () => {
    it('emits set-playing-state when version > 0 and no write is queued', async () => {
      connectPlaybackSync('token');
      syncPlayingStateToServer(false);
      await flushMicrotasks();

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'command:set-playing-state',
        expect.objectContaining({ isPlaying: true, expectedVersion: 1 }),
        expect.any(Function),
      );
    });

    it('falls back to set-state when playbackVersion is 0', async () => {
      vi.mocked(usePlayerStore.getState).mockReturnValue(
        createPlayerStateMock({ ...baseState, playbackVersion: 0 }),
      );
      connectPlaybackSync('token');
      syncPlayingStateToServer(true);
      await flushMicrotasks();

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'command:set-state',
        expect.objectContaining({ claimActiveDevice: true }),
        expect.any(Function),
      );
    });
  });

  describe('listPlaybackDevices', () => {
    it('emits list-devices and updates store', async () => {
      connectPlaybackSync('token');
      const listDevice: ListPlaybackDeviceEntry = {
        id: 'd1',
        name: 'D1',
        icon: 'desktop',
        isActive: true,
        isCurrentDevice: false,
      };
      mockSocket.emit.mockImplementation(
        (event: string, _data: unknown, callback: (r: ListPlaybackDevicesResponse) => void) => {
          if (event === 'query:list-devices') {
            callback({ devices: [listDevice] });
          }
        },
      );

      await listPlaybackDevices();
      expect(usePlayerStore.getState().setPlaybackDevices).toHaveBeenCalledWith([listDevice]);
    });
  });

  describe('emitCurrentTimeSync', () => {
    it('emits current time and handles response', async () => {
      connectPlaybackSync('token');
      mockSocket.emit.mockImplementation(
        (event: string, _data: unknown, callback: (r: EmitCallbackPayload) => void) => {
          if (event === 'command:set-current-time-state') {
            callback({ currentTime: 50, version: 10 });
          }
        },
      );

      await emitCurrentTimeSync(50);
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'command:set-current-time-state',
        expect.objectContaining({ currentTime: 50 }),
        expect.any(Function),
      );
      expect(usePlayerStore.setState).toHaveBeenCalledWith(
        expect.objectContaining({ currentTime: 50, playbackVersion: 10 }),
      );
    });

    it('handles version conflict by refetching state', async () => {
      connectPlaybackSync('token');
      mockSocket.emit.mockImplementation(
        (event: string, _data: unknown, callback: (r: EmitCallbackPayload) => void) => {
          if (event === 'command:set-current-time-state') {
            callback({ error: 'version mismatch', code: 'CONFLICT' });
          } else if (event === 'query:get-state') {
            callback({ version: 11 } as unknown as PlaybackState);
          }
        },
      );

      await emitCurrentTimeSync(50);
      expect(mockSocket.emit).toHaveBeenCalledWith('query:get-state', {}, expect.any(Function));
      expect(usePlayerStore.getState().applyPlaybackStateFromServer).toHaveBeenCalled();
    });
  });

  describe('setActivePlaybackDevice', () => {
    it('emits set-active-device', async () => {
      connectPlaybackSync('token');
      mockSocket.emit.mockImplementation(
        (event: string, _data: unknown, callback: (r: EmitCallbackPayload) => void) => {
          if (event === 'command:set-active-device') {
            callback({ version: 20 } as unknown as PlaybackState);
          }
        },
      );

      await setActivePlaybackDevice('new-device');
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'command:set-active-device',
        expect.objectContaining({ deviceId: 'new-device' }),
        expect.any(Function),
      );
    });

    it('handles no playbackVersion', async () => {
      vi.mocked(usePlayerStore.getState).mockReturnValue(
        createPlayerStateMock({ ...baseState, playbackVersion: 0 }),
      );
      connectPlaybackSync('token');

      await setActivePlaybackDevice('new-device');
      expect(mockSocket.emit).not.toHaveBeenCalledWith(
        'command:set-active-device',
        expect.any(Object),
        expect.any(Function),
      );
    });
  });

  describe('isPlaybackSyncConnected', () => {
    it('returns socket status', () => {
      expect(isPlaybackSyncConnected()).toBe(false);
      connectPlaybackSync('token');
      expect(isPlaybackSyncConnected()).toBe(true);
    });
  });

  describe('Extra Coverage', () => {
    it('getPlaybackSocket returns the socket', () => {
      connectPlaybackSync('token');
      expect(getPlaybackSocket()).toBe(mockSocket);
    });

    it('set-state payload is built from the store at flush, not when the write is queued', async () => {
      const queueBefore = [
        testQueueItem({
          queueId: '01900000-0000-7000-8000-0000000000b1',
          track: playbackTrackStub('t-a'),
        }),
      ];
      const queueAfter = [
        testQueueItem({
          queueId: '01900000-0000-7000-8000-0000000000b2',
          track: playbackTrackStub('t-b'),
        }),
      ];
      vi.mocked(usePlayerStore.getState).mockReturnValue(
        createPlayerStateMock({
          ...baseState,
          currentTrack: playbackTrackStub('track-1'),
          queue: queueBefore,
          playbackVersion: 1,
        }),
      );
      connectPlaybackSync('token');
      afterLocalPlaybackMutation();

      vi.mocked(usePlayerStore.getState).mockReturnValue(
        createPlayerStateMock({
          ...baseState,
          currentTrack: playbackTrackStub('track-1'),
          queue: queueAfter,
          playbackVersion: 2,
        }),
      );
      await flushMicrotasks();

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'command:set-state',
        expect.objectContaining({
          expectedVersion: 2,
          state: expect.objectContaining({
            queue: [
              expect.objectContaining({
                queueId: '01900000-0000-7000-8000-0000000000b2',
                position: 0,
              }),
            ],
          }),
        }),
        expect.any(Function),
      );
    });

    it('buildSetStateBody handles queue mapping', async () => {
      const queueItem: QueueItem = testQueueItem({
        queueId: '01900000-0000-7000-8000-0000000000a1',
        track: playbackTrackStub('track-1'),
      });
      vi.mocked(usePlayerStore.getState).mockReturnValue(
        createPlayerStateMock({
          ...baseState,
          currentTrack: playbackTrackStub('track-1'),
          queue: [queueItem],
          playbackVersion: 1,
        }),
      );
      connectPlaybackSync('token');
      afterLocalPlaybackMutation();
      await flushMicrotasks();
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'command:set-state',
        expect.objectContaining({
          state: expect.objectContaining({
            queue: [
              expect.objectContaining({
                queueId: '01900000-0000-7000-8000-0000000000a1',
                position: 0,
              }),
            ],
            history: [],
          }),
        }),
        expect.any(Function),
      );
    });

    it('buildSetStateBody includes history from store', async () => {
      const histItem = testQueueItem({
        queueId: '01900000-0000-7000-8000-0000000000h1',
        track: playbackTrackStub('prev'),
        type: 'playingNext',
      });
      vi.mocked(usePlayerStore.getState).mockReturnValue(
        createPlayerStateMock({
          ...baseState,
          currentTrack: playbackTrackStub('track-1'),
          queue: [],
          history: [histItem],
          playbackVersion: 1,
        }),
      );
      connectPlaybackSync('token');
      afterLocalPlaybackMutation();
      await flushMicrotasks();
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'command:set-state',
        expect.objectContaining({
          state: expect.objectContaining({
            history: [
              expect.objectContaining({
                queueId: '01900000-0000-7000-8000-0000000000h1',
              }),
            ],
          }),
        }),
        expect.any(Function),
      );
    });

    it('isVersionConflict handles various message formats', async () => {
      connectPlaybackSync('token');
      mockSocket.emit.mockImplementation(
        (event: string, _data: unknown, callback: (r: EmitCallbackPayload) => void) => {
          if (event === 'command:set-current-time-state') {
            callback({ error: 'version mismatch', code: 'OTHER' });
          } else if (event === 'query:get-state') {
            callback({ version: 100 } as unknown as PlaybackState);
          }
        },
      );
      await emitCurrentTimeSync(10);
      expect(mockSocket.emit).toHaveBeenCalledWith('query:get-state', {}, expect.any(Function));
    });

    it('isVersionConflict returns false when not a conflict', async () => {
      connectPlaybackSync('token');
      mockSocket.emit.mockImplementation(
        (_e: string, _d: unknown, callback: (r: EmitCallbackPayload) => void) => {
          callback({ error: 'general error', code: 'ERROR' });
        },
      );
      await emitCurrentTimeSync(10);
      expect(mockSocket.emit).not.toHaveBeenCalledWith(
        'query:get-state',
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('hydrate handles null payload', () => {
      connectPlaybackSync('token');
      const connectHandler = findOnHandler(mockSocket.on.mock.calls, 'connect');
      mockSocket.emit.mockImplementation(
        (event: string, _data: unknown, callback: (r: EmitCallbackPayload) => void) => {
          if (event === 'query:get-state') callback(null);
        },
      );
      connectHandler();
      expect(usePlayerStore.getState().applyPlaybackStateFromServer).not.toHaveBeenCalled();
    });

    it('hydrate returns early if disconnected', () => {
      connectPlaybackSync('token');
      mockSocket.connected = false;
      const connectHandler = findOnHandler(mockSocket.on.mock.calls, 'connect');
      connectHandler();
      expect(mockSocket.emit).not.toHaveBeenCalledWith(
        'query:get-state',
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('afterLocalPlaybackMutation returns early if no currentTrack', () => {
      vi.mocked(usePlayerStore.getState).mockReturnValue(
        createPlayerStateMock({ ...baseState, currentTrack: null }),
      );
      connectPlaybackSync('token');
      afterLocalPlaybackMutation();
      expect(mockSocket.emit).not.toHaveBeenCalledWith(
        'command:set-state',
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('afterLocalPlaybackMutationWithClaim returns early if no currentTrack', () => {
      vi.mocked(usePlayerStore.getState).mockReturnValue(
        createPlayerStateMock({ ...baseState, currentTrack: null }),
      );
      connectPlaybackSync('token');
      afterLocalPlaybackMutationWithClaim(true);
      expect(mockSocket.emit).not.toHaveBeenCalledWith(
        'command:set-state',
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('listPlaybackDevices returns early if disconnected', async () => {
      mockSocket.connected = false;
      await listPlaybackDevices();
      expect(mockSocket.emit).not.toHaveBeenCalledWith(
        'query:list-devices',
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('emitCurrentTimeSync returns early if disconnected or invalid state', async () => {
      // Disconnected - socket is null here because connectPlaybackSync not called yet
      await emitCurrentTimeSync(10);
      expect(mockSocket.emit).not.toHaveBeenCalledWith(
        'command:set-current-time-state',
        expect.any(Object),
        expect.any(Function),
      );

      // Connected but invalid state
      connectPlaybackSync('token');

      // No track
      vi.mocked(usePlayerStore.getState).mockReturnValue(
        createPlayerStateMock({ ...baseState, currentTrack: null }),
      );
      await emitCurrentTimeSync(10);
      expect(mockSocket.emit).not.toHaveBeenCalledWith(
        'command:set-current-time-state',
        expect.any(Object),
        expect.any(Function),
      );

      // No version
      vi.mocked(usePlayerStore.getState).mockReturnValue(
        createPlayerStateMock({ ...baseState, playbackVersion: 0 }),
      );
      await emitCurrentTimeSync(10);
      expect(mockSocket.emit).not.toHaveBeenCalledWith(
        'command:set-current-time-state',
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('emitCurrentTimeSync handles null resync payload and non-error falsy result', async () => {
      connectPlaybackSync('token');
      // Case 1: Conflict with null state payload
      mockSocket.emit
        .mockImplementationOnce(
          (_e: string, _d: unknown, callback: (r: EmitCallbackPayload) => void) => {
            callback({ error: 'conflict', code: 'CONFLICT' });
          },
        )
        .mockImplementationOnce(
          (_e: string, _d: unknown, callback: (r: EmitCallbackPayload) => void) => {
            callback(null); // Resync payload is null
          },
        );
      await emitCurrentTimeSync(10);
      expect(usePlayerStore.getState().applyPlaybackStateFromServer).not.toHaveBeenCalled();

      // Case 2: result is null in success path
      mockSocket.emit.mockImplementationOnce(
        (_e: string, _d: unknown, callback: (r: EmitCallbackPayload) => void) => {
          callback(null);
        },
      );
      await emitCurrentTimeSync(10);
      expect(usePlayerStore.setState).not.toHaveBeenCalled();
    });

    it('setActivePlaybackDevice returns early if disconnected', async () => {
      mockSocket.connected = false;
      await setActivePlaybackDevice('d1');
      expect(mockSocket.emit).not.toHaveBeenCalledWith(
        'command:set-active-device',
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('afterLocalPlaybackMutationWithClaim returns early if disconnected', () => {
      mockSocket.connected = false;
      afterLocalPlaybackMutationWithClaim(true);
      expect(mockSocket.emit).not.toHaveBeenCalledWith(
        'command:set-state',
        expect.any(Object),
        expect.any(Function),
      );
    });
  });
});
