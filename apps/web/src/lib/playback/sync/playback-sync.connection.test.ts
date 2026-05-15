import { createPlayerStateMock } from '@/components/app/test-utils/player-test-utils';
import { usePlayerStore } from '@/stores/player-store/player.store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPlaybackSocket } from '../playback-socket';
import {
  connectPlaybackSync,
  disconnectPlaybackSync,
  getPlaybackSocket,
  isPlaybackSyncConnected,
  PLAYBACK_PRESENCE_TOUCH_INTERVAL_MS,
} from './playback-sync';
import { emitPresenceTouch } from './playback-sync.commands';
import {
  asSocketMock,
  basePlaybackSyncTestState,
  createPlaybackSocketMock,
  findEmitAck,
  findOnHandler,
  flushMicrotasks,
  playbackStateFixture,
  type EmitCallbackPayload,
  type PlaybackSocketMock,
} from './playback-sync.test-helpers';

vi.mock('../playback-socket', () => ({
  createPlaybackSocket: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    once: vi.fn(),
    off: vi.fn(),
    disconnect: vi.fn(),
    removeAllListeners: vi.fn(),
    connected: true,
  })),
}));

vi.mock('../playback-device', () => ({
  getLocalPlaybackDeviceMetadata: vi.fn(() => ({
    playbackDeviceId: 'device-1',
    deviceName: 'Web',
    deviceIcon: 'desktop',
  })),
}));

vi.mock('@/stores/player-store/player.store', () => ({
  usePlayerStore: {
    getState: vi.fn(),
    setState: vi.fn(),
  },
}));

vi.mock('./playback-sync.commands', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./playback-sync.commands')>();
  return {
    ...actual,
    emitPresenceTouch: vi.fn().mockResolvedValue(undefined),
  };
});

describe('playback-sync connection', () => {
  let mockSocket: PlaybackSocketMock;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket = createPlaybackSocketMock();
    vi.mocked(createPlaybackSocket).mockReturnValue(asSocketMock(mockSocket));
    vi.mocked(usePlayerStore.getState).mockReturnValue({ ...basePlaybackSyncTestState });
  });

  afterEach(() => {
    disconnectPlaybackSync();
  });

  describe('connectPlaybackSync', () => {
    it('initializes socket and registers listeners', () => {
      connectPlaybackSync('token');

      expect(createPlaybackSocket).toHaveBeenCalled();
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith(
        'event:playback-state-updated',
        expect.any(Function),
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        'event:current-time-updated',
        expect.any(Function),
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        'event:playback-session-ended',
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
      hydrateAck(playbackStateFixture({ version: 1 }));
      expect(usePlayerStore.getState().applyPlaybackStateFromServer).toHaveBeenCalled();

      expect(mockSocket.emit).toHaveBeenCalledWith('query:list-devices', {}, expect.any(Function));
    });

    it('swallows rejected presence-touch on initial connect', async () => {
      mockSocket.emit.mockImplementation(
        (event: string, _data: unknown, cb?: (r: unknown) => void) => {
          if (event === 'query:get-state' && cb) cb(null);
          if (event === 'query:list-devices' && cb) cb({ devices: [] });
        },
      );
      const emitPresenceTouchMock = vi.mocked(emitPresenceTouch);
      emitPresenceTouchMock.mockRejectedValueOnce(new Error('presence failed on connect'));
      emitPresenceTouchMock.mockResolvedValue(undefined);

      connectPlaybackSync('token');
      const connectHandler = findOnHandler(mockSocket.on.mock.calls, 'connect');
      connectHandler();
      await flushMicrotasks();

      emitPresenceTouchMock.mockReset();
      emitPresenceTouchMock.mockResolvedValue(undefined);
    });

    it('swallows rejected presence-touch from the heartbeat interval', async () => {
      vi.useFakeTimers();
      try {
        mockSocket.emit.mockImplementation(
          (event: string, _data: unknown, cb?: (r: unknown) => void) => {
            if (event === 'query:get-state' && cb) cb(null);
            if (event === 'query:list-devices' && cb) cb({ devices: [] });
          },
        );
        const emitPresenceTouchMock = vi.mocked(emitPresenceTouch);
        emitPresenceTouchMock.mockResolvedValueOnce(undefined);
        emitPresenceTouchMock.mockRejectedValue(new Error('presence failed'));

        connectPlaybackSync('token');
        const connectHandler = findOnHandler(mockSocket.on.mock.calls, 'connect');
        connectHandler();

        await vi.advanceTimersByTimeAsync(PLAYBACK_PRESENCE_TOUCH_INTERVAL_MS);
        await flushMicrotasks();

        expect(emitPresenceTouchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
      } finally {
        vi.useRealTimers();
        vi.mocked(emitPresenceTouch).mockReset();
        vi.mocked(emitPresenceTouch).mockResolvedValue(undefined);
      }
    });

    it('clears presence heartbeat interval on socket disconnect', async () => {
      vi.useFakeTimers();
      try {
        mockSocket.emit.mockImplementation(
          (event: string, _data: unknown, cb?: (r: unknown) => void) => {
            if (event === 'query:get-state' && cb) cb(null);
            if (event === 'query:list-devices' && cb) cb({ devices: [] });
          },
        );
        const emitPresenceTouchMock = vi.mocked(emitPresenceTouch);
        emitPresenceTouchMock.mockResolvedValue(undefined);

        connectPlaybackSync('token');
        const connectHandler = findOnHandler(mockSocket.on.mock.calls, 'connect');
        const disconnectHandler = findOnHandler(mockSocket.on.mock.calls, 'disconnect');
        connectHandler();
        await flushMicrotasks();
        disconnectHandler();
        await vi.advanceTimersByTimeAsync(PLAYBACK_PRESENCE_TOUCH_INTERVAL_MS);
        await flushMicrotasks();

        expect(emitPresenceTouchMock).toHaveBeenCalledTimes(1);
      } finally {
        vi.useRealTimers();
        vi.mocked(emitPresenceTouch).mockReset();
        vi.mocked(emitPresenceTouch).mockResolvedValue(undefined);
      }
    });

    it('recovers when first listPlaybackDevices call fails on connect', async () => {
      connectPlaybackSync('token');
      const connectHandler = findOnHandler(mockSocket.on.mock.calls, 'connect');
      let listDevicesEmits = 0;
      mockSocket.emit.mockImplementation((event, _data, cb) => {
        if (event === 'query:get-state' && cb) cb(null);
        if (event === 'query:list-devices') {
          listDevicesEmits += 1;
          if (listDevicesEmits === 1) {
            queueMicrotask(() => mockSocket.simulateDisconnect());
          } else if (cb) {
            cb({ devices: [] });
          }
        }
      });
      connectHandler(); // first connect -> list-devices fails
      await flushMicrotasks();
      connectHandler(); // reconnect -> list-devices succeeds
      await flushMicrotasks();
      expect(listDevicesEmits).toBe(2);
      expect(usePlayerStore.getState().setPlaybackDevices).toHaveBeenCalledWith([]);
    });

    it('applies state from server on update event', () => {
      connectPlaybackSync('token');
      const updateHandler = findOnHandler(mockSocket.on.mock.calls, 'event:playback-state-updated');

      const newState = playbackStateFixture({ version: 2 });
      updateHandler(newState);

      expect(usePlayerStore.getState().applyPlaybackStateFromServer).toHaveBeenCalledWith(newState);
    });

    it('clears session when playback-session-ended fires', () => {
      connectPlaybackSync('token');
      const endedHandler = findOnHandler(mockSocket.on.mock.calls, 'event:playback-session-ended');
      endedHandler();
      expect(usePlayerStore.getState().clearSessionPlayback).toHaveBeenCalled();
    });

    it('applies current time update from server', () => {
      connectPlaybackSync('token');
      const timeHandler = findOnHandler(mockSocket.on.mock.calls, 'event:current-time-updated');

      vi.mocked(usePlayerStore.getState).mockReturnValue(
        createPlayerStateMock({
          ...basePlaybackSyncTestState,
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

      vi.mocked(usePlayerStore.getState).mockReturnValue(
        createPlayerStateMock({
          ...basePlaybackSyncTestState,
          playbackVersion: 5,
          activeDeviceId: 'other-device',
          localPlaybackDeviceId: 'this-device',
        }),
      );
      timeHandler({ currentTime: 20, version: 2 });
      expect(usePlayerStore.setState).toHaveBeenCalledTimes(1);

      vi.mocked(usePlayerStore.getState).mockReturnValue(
        createPlayerStateMock({
          ...basePlaybackSyncTestState,
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

  describe('isPlaybackSyncConnected', () => {
    it('returns socket status', () => {
      expect(isPlaybackSyncConnected()).toBe(false);
      connectPlaybackSync('token');
      expect(isPlaybackSyncConnected()).toBe(true);
    });
  });

  describe('getPlaybackSocket', () => {
    it('returns the socket', () => {
      connectPlaybackSync('token');
      expect(getPlaybackSocket()).toBe(mockSocket);
    });
  });

  describe('hydrate edge cases', () => {
    it('handles null payload', () => {
      connectPlaybackSync('token');
      const connectHandler = findOnHandler(mockSocket.on.mock.calls, 'connect');
      mockSocket.emit.mockImplementation(
        (event: string, _data: unknown, callback: (r: EmitCallbackPayload) => void) => {
          if (event === 'query:get-state') callback(null);
        },
      );
      connectHandler();
      expect(usePlayerStore.getState().applyPlaybackStateFromServer).not.toHaveBeenCalled();
      expect(usePlayerStore.getState().clearSessionPlayback).toHaveBeenCalled();
    });

    it('returns early if disconnected', () => {
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
  });
});
