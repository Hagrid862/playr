import { createPlayerStateMock } from '@/components/app/test-utils/player-test-utils';
import { usePlayerStore } from '@/stores/player-store/player.store';
import type { ListPlaybackDeviceEntry, PlaybackState } from '@repo/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPlaybackSocket } from '../playback-socket';
import {
  afterLocalPlaybackMutation,
  afterLocalPlaybackMutationWithClaim,
  connectPlaybackSync,
  disconnectPlaybackSync,
  emitCurrentTimeSync,
  emitPresenceTouch,
  listPlaybackDevices,
  setActivePlaybackDevice,
  syncPlayingStateToServer,
} from './playback-sync';
import {
  PlaybackSocketAckTimeoutError,
  PlaybackSocketDisconnectedError,
} from './playback-sync.emit-with-ack';
import * as playbackSyncState from './playback-sync.state';
import {
  asSocketMock,
  basePlaybackSyncTestState,
  createPlaybackSocketMock,
  flushMicrotasks,
  playbackStateFixture,
  type EmitCallbackPayload,
  type PlaybackSocketMock,
} from './playback-sync.test-helpers';
import * as writePipeline from './playback-sync.write-pipeline';

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

describe('playback-sync commands', () => {
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

  describe('syncPlayingStateToServer', () => {
    it('returns early when playback socket is not connected', async () => {
      const mergeSpy = vi.spyOn(writePipeline, 'mergeOrQueueFullSnapshot');
      vi.mocked(usePlayerStore.getState).mockReturnValue(
        createPlayerStateMock({ ...basePlaybackSyncTestState }),
      );
      syncPlayingStateToServer(false);
      await flushMicrotasks();

      expect(mergeSpy).not.toHaveBeenCalled();
      mergeSpy.mockRestore();
    });

    it('returns early when connected but there is no current track', async () => {
      vi.mocked(usePlayerStore.getState).mockReturnValue(
        createPlayerStateMock({ ...basePlaybackSyncTestState, currentTrack: null }),
      );
      connectPlaybackSync('token');
      syncPlayingStateToServer(false);
      await flushMicrotasks();

      expect(mockSocket.emit).not.toHaveBeenCalledWith(
        'command:set-playing-state',
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('queues full snapshot when playbackVersion is 0', async () => {
      const mergeSpy = vi.spyOn(writePipeline, 'mergeOrQueueFullSnapshot');
      vi.mocked(usePlayerStore.getState).mockReturnValue(
        createPlayerStateMock({ ...basePlaybackSyncTestState, playbackVersion: 0 }),
      );
      connectPlaybackSync('token');
      syncPlayingStateToServer(true);
      await flushMicrotasks();

      expect(mergeSpy).toHaveBeenCalledWith(true);
      mergeSpy.mockRestore();
    });

    it('queues full snapshot when a set-state write is in flight', async () => {
      const mergeSpy = vi.spyOn(writePipeline, 'mergeOrQueueFullSnapshot');
      vi.mocked(usePlayerStore.getState).mockReturnValue(
        createPlayerStateMock({ ...basePlaybackSyncTestState, playbackVersion: 5 }),
      );
      connectPlaybackSync('token');
      playbackSyncState.setWriteInFlight(true);
      syncPlayingStateToServer(false);
      await flushMicrotasks();

      expect(mergeSpy).toHaveBeenCalledWith(false);
      mergeSpy.mockRestore();
    });

    it('queues full snapshot when a pending full-state write already exists', async () => {
      const mergeSpy = vi.spyOn(writePipeline, 'mergeOrQueueFullSnapshot');
      vi.mocked(usePlayerStore.getState).mockReturnValue(
        createPlayerStateMock({ ...basePlaybackSyncTestState, playbackVersion: 5 }),
      );
      connectPlaybackSync('token');
      playbackSyncState.setPendingSetStateWrite({ kind: 'full-state', claimActiveDevice: false });
      syncPlayingStateToServer(true);
      await flushMicrotasks();

      expect(mergeSpy).toHaveBeenCalledWith(true);
      mergeSpy.mockRestore();
    });

    it('schedules playing-state write when no full snapshot path applies', async () => {
      const setPendingSpy = vi.spyOn(playbackSyncState, 'setPendingPlayingWrite');
      const scheduleSpy = vi.spyOn(writePipeline, 'scheduleFlushWriteQueue');
      vi.mocked(usePlayerStore.getState).mockReturnValue(
        createPlayerStateMock({ ...basePlaybackSyncTestState, playbackVersion: 12 }),
      );
      connectPlaybackSync('token');
      syncPlayingStateToServer(true);
      await flushMicrotasks();

      expect(setPendingSpy).toHaveBeenCalledWith({
        kind: 'playing-state',
        claimActiveDevice: true,
      });
      expect(scheduleSpy).toHaveBeenCalled();
      setPendingSpy.mockRestore();
      scheduleSpy.mockRestore();
    });
  });

  describe('afterLocalPlaybackMutation', () => {
    it('requests set-state write without claiming active device', () => {
      const reqSpy = vi.spyOn(writePipeline, 'requestSetStateWrite');
      afterLocalPlaybackMutation();
      expect(reqSpy).toHaveBeenCalledWith(false);
      reqSpy.mockRestore();
    });
  });

  describe('afterLocalPlaybackMutationWithClaim', () => {
    it('requests set-state write with claim flag', () => {
      const reqSpy = vi.spyOn(writePipeline, 'requestSetStateWrite');
      afterLocalPlaybackMutationWithClaim(true);
      expect(reqSpy).toHaveBeenCalledWith(true);
      reqSpy.mockRestore();
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
        (
          event: string,
          _data: unknown,
          callback: (r: { devices: ListPlaybackDeviceEntry[] }) => void,
        ) => {
          if (event === 'query:list-devices') {
            callback({ devices: [listDevice] });
          }
        },
      );

      await listPlaybackDevices();
      expect(usePlayerStore.getState().setPlaybackDevices).toHaveBeenCalledWith([listDevice]);
    });

    it('returns early if disconnected', async () => {
      mockSocket.connected = false;
      await listPlaybackDevices();
      expect(mockSocket.emit).not.toHaveBeenCalledWith(
        'query:list-devices',
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('rejects when list-devices ack times out', async () => {
      vi.useFakeTimers();
      try {
        connectPlaybackSync('token');
        mockSocket.emit.mockImplementation(() => {
          /* never invoke ack */
        });
        const p = listPlaybackDevices(5000);
        const rejectsAssertion = expect(p).rejects.toBeInstanceOf(PlaybackSocketAckTimeoutError);
        await vi.advanceTimersByTimeAsync(5000);
        await rejectsAssertion;
      } finally {
        vi.useRealTimers();
      }
    });

    it('rejects when socket disconnects before list-devices ack', async () => {
      connectPlaybackSync('token');
      mockSocket.emit.mockImplementation((event: string) => {
        if (event === 'query:list-devices') {
          queueMicrotask(() => mockSocket.simulateDisconnect());
        }
      });
      await expect(listPlaybackDevices(5000)).rejects.toBeInstanceOf(
        PlaybackSocketDisconnectedError,
      );
    });
  });

  describe('emitPresenceTouch', () => {
    it('emits command:presence-touch and resolves ack', async () => {
      connectPlaybackSync('token');
      mockSocket.emit.mockImplementation(
        (event: string, _data: unknown, callback: (r: unknown) => void) => {
          if (event === 'command:presence-touch') {
            callback({ ok: true, serverTime: new Date().toISOString() });
          }
        },
      );

      await emitPresenceTouch();
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'command:presence-touch',
        {},
        expect.any(Function),
      );
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
            callback(playbackStateFixture({ version: 11 }));
          }
        },
      );

      await emitCurrentTimeSync(50);
      expect(mockSocket.emit).toHaveBeenCalledWith('query:get-state', {}, expect.any(Function));
      expect(usePlayerStore.getState().applyPlaybackStateFromServer).toHaveBeenCalled();
    });

    it('detects version conflict from error message even when code is not CONFLICT', async () => {
      connectPlaybackSync('token');
      mockSocket.emit.mockImplementation(
        (event: string, _data: unknown, callback: (r: EmitCallbackPayload) => void) => {
          if (event === 'command:set-current-time-state') {
            callback({ error: 'version mismatch', code: 'OTHER' });
          } else if (event === 'query:get-state') {
            callback(playbackStateFixture({ version: 100 }));
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

    it('returns early if disconnected or invalid state', async () => {
      await emitCurrentTimeSync(10);
      expect(mockSocket.emit).not.toHaveBeenCalledWith(
        'command:set-current-time-state',
        expect.any(Object),
        expect.any(Function),
      );

      connectPlaybackSync('token');

      vi.mocked(usePlayerStore.getState).mockReturnValue(
        createPlayerStateMock({ ...basePlaybackSyncTestState, currentTrack: null }),
      );
      await emitCurrentTimeSync(10);
      expect(mockSocket.emit).not.toHaveBeenCalledWith(
        'command:set-current-time-state',
        expect.any(Object),
        expect.any(Function),
      );

      vi.mocked(usePlayerStore.getState).mockReturnValue(
        createPlayerStateMock({ ...basePlaybackSyncTestState, playbackVersion: 0 }),
      );
      await emitCurrentTimeSync(10);
      expect(mockSocket.emit).not.toHaveBeenCalledWith(
        'command:set-current-time-state',
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('handles null resync payload and non-error falsy result', async () => {
      connectPlaybackSync('token');
      mockSocket.emit
        .mockImplementationOnce(
          (_e: string, _d: unknown, callback: (r: EmitCallbackPayload) => void) => {
            callback({ error: 'conflict', code: 'CONFLICT' });
          },
        )
        .mockImplementationOnce(
          (_e: string, _d: unknown, callback: (r: EmitCallbackPayload) => void) => {
            callback(null);
          },
        );
      await emitCurrentTimeSync(10);
      expect(usePlayerStore.getState().applyPlaybackStateFromServer).not.toHaveBeenCalled();
      expect(usePlayerStore.getState().clearSessionPlayback).toHaveBeenCalled();

      mockSocket.emit.mockImplementationOnce(
        (_e: string, _d: unknown, callback: (r: EmitCallbackPayload) => void) => {
          callback(null);
        },
      );
      await emitCurrentTimeSync(10);
      expect(usePlayerStore.setState).not.toHaveBeenCalled();
    });

    it('rejects when set-current-time-state ack times out', async () => {
      vi.useFakeTimers();
      try {
        connectPlaybackSync('token');
        mockSocket.emit.mockImplementation(() => {
          /* never invoke ack */
        });
        const p = emitCurrentTimeSync(10, 5000);
        const rejectsAssertion = expect(p).rejects.toBeInstanceOf(PlaybackSocketAckTimeoutError);
        await vi.advanceTimersByTimeAsync(5000);
        await rejectsAssertion;
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('setActivePlaybackDevice', () => {
    it('emits set-active-device', async () => {
      connectPlaybackSync('token');
      mockSocket.emit.mockImplementation(
        (event: string, _data: unknown, callback: (r: EmitCallbackPayload) => void) => {
          if (event === 'command:set-active-device') {
            callback(playbackStateFixture({ version: 20 }));
          } else if (event === 'query:list-devices') {
            callback({ devices: [] });
          }
        },
      );

      await setActivePlaybackDevice('new-device');
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'command:set-active-device',
        expect.objectContaining({ deviceId: 'new-device' }),
        expect.any(Function),
      );
      expect(mockSocket.emit).toHaveBeenCalledWith('query:list-devices', {}, expect.any(Function));
    });

    it('handles no playbackVersion', async () => {
      vi.mocked(usePlayerStore.getState).mockReturnValue(
        createPlayerStateMock({ ...basePlaybackSyncTestState, playbackVersion: 0 }),
      );
      connectPlaybackSync('token');

      await setActivePlaybackDevice('new-device');
      expect(mockSocket.emit).not.toHaveBeenCalledWith(
        'command:set-active-device',
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('returns early if disconnected', async () => {
      mockSocket.connected = false;
      await setActivePlaybackDevice('d1');
      expect(mockSocket.emit).not.toHaveBeenCalledWith(
        'command:set-active-device',
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('on version conflict refetches state and retries set-active-device', async () => {
      let playbackVersion = 1;
      const applyPlaybackStateFromServer = vi.fn((s: PlaybackState) => {
        playbackVersion = s.version;
      });
      vi.mocked(usePlayerStore.getState).mockImplementation(() =>
        createPlayerStateMock({
          ...basePlaybackSyncTestState,
          playbackVersion,
          applyPlaybackStateFromServer,
        }),
      );

      connectPlaybackSync('token');
      let setActiveDeviceCalls = 0;
      mockSocket.emit.mockImplementation(
        (event: string, _data: unknown, callback: (r: EmitCallbackPayload) => void) => {
          if (event === 'command:set-active-device') {
            setActiveDeviceCalls += 1;
            if (setActiveDeviceCalls === 1) {
              callback({ error: 'version mismatch', code: 'CONFLICT' });
            } else {
              callback(playbackStateFixture({ version: 31 }));
            }
          } else if (event === 'query:get-state') {
            callback(playbackStateFixture({ version: 30 }));
          } else if (event === 'query:list-devices') {
            callback({ devices: [] });
          }
        },
      );

      await setActivePlaybackDevice('new-device');

      expect(setActiveDeviceCalls).toBe(2);
      expect(mockSocket.emit).toHaveBeenCalledWith('query:get-state', {}, expect.any(Function));
      const setActiveEmits = mockSocket.emit.mock.calls.filter(
        (c) => c[0] === 'command:set-active-device',
      );
      expect(setActiveEmits[0]?.[1]).toEqual(
        expect.objectContaining({ deviceId: 'new-device', expectedVersion: 1 }),
      );
      expect(setActiveEmits[1]?.[1]).toEqual(
        expect.objectContaining({ deviceId: 'new-device', expectedVersion: 30 }),
      );
      expect(applyPlaybackStateFromServer).toHaveBeenCalledWith(
        expect.objectContaining({ version: 30 }),
      );
      expect(applyPlaybackStateFromServer).toHaveBeenCalledWith(
        expect.objectContaining({ version: 31 }),
      );
    });

    it('on non-conflict error resolves without get-state', async () => {
      connectPlaybackSync('token');
      mockSocket.emit.mockImplementation(
        (_event: string, _data: unknown, callback: (r: EmitCallbackPayload) => void) => {
          callback({ error: 'other', code: 'ERROR' });
        },
      );

      await setActivePlaybackDevice('new-device');

      expect(mockSocket.emit).not.toHaveBeenCalledWith(
        'query:get-state',
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('on conflict when get-state returns null, clears session playback', async () => {
      const apply = vi.mocked(usePlayerStore.getState().applyPlaybackStateFromServer);
      const callsBefore = apply.mock.calls.length;

      connectPlaybackSync('token');
      mockSocket.emit.mockImplementation(
        (event: string, _data: unknown, callback: (r: EmitCallbackPayload) => void) => {
          if (event === 'command:set-active-device') {
            callback({ error: 'version mismatch', code: 'CONFLICT' });
          } else if (event === 'query:get-state') {
            callback(null);
          }
        },
      );

      await setActivePlaybackDevice('new-device');

      expect(mockSocket.emit).toHaveBeenCalledWith('query:get-state', {}, expect.any(Function));
      expect(apply.mock.calls.length).toBe(callsBefore);
      expect(usePlayerStore.getState().clearSessionPlayback).toHaveBeenCalled();
    });

    it('on conflict when getSocket is null after hydrate, skips set-active-device retry', async () => {
      connectPlaybackSync('token');
      const getSocketSpy = vi.spyOn(playbackSyncState, 'getSocket');
      let getSocketCalls = 0;
      getSocketSpy.mockImplementation(() => {
        getSocketCalls += 1;
        if (getSocketCalls === 1) {
          return asSocketMock(mockSocket);
        }
        return null;
      });

      let setActiveDeviceCalls = 0;
      mockSocket.emit.mockImplementation(
        (event: string, _data: unknown, callback: (r: EmitCallbackPayload) => void) => {
          if (event === 'command:set-active-device') {
            setActiveDeviceCalls += 1;
            callback({ error: 'version mismatch', code: 'CONFLICT' });
          } else if (event === 'query:get-state') {
            callback(playbackStateFixture({ version: 30 }));
          }
        },
      );

      await setActivePlaybackDevice('new-device');

      expect(setActiveDeviceCalls).toBe(1);
      expect(mockSocket.emit).not.toHaveBeenCalledWith(
        'query:list-devices',
        expect.any(Object),
        expect.any(Function),
      );
      getSocketSpy.mockRestore();
    });

    it('on version conflict when retry ack is not a playback state envelope, does not apply retry payload', async () => {
      let playbackVersion = 1;
      const applyPlaybackStateFromServer = vi.fn((s: PlaybackState) => {
        playbackVersion = s.version;
      });
      vi.mocked(usePlayerStore.getState).mockImplementation(() =>
        createPlayerStateMock({
          ...basePlaybackSyncTestState,
          playbackVersion,
          applyPlaybackStateFromServer,
        }),
      );

      connectPlaybackSync('token');
      let setActiveDeviceCalls = 0;
      mockSocket.emit.mockImplementation(
        (event: string, _data: unknown, callback: (r: EmitCallbackPayload) => void) => {
          if (event === 'command:set-active-device') {
            setActiveDeviceCalls += 1;
            if (setActiveDeviceCalls === 1) {
              callback({ error: 'version mismatch', code: 'CONFLICT' });
            } else {
              callback({});
            }
          } else if (event === 'query:get-state') {
            callback(playbackStateFixture({ version: 30 }));
          }
        },
      );

      await setActivePlaybackDevice('new-device');

      expect(setActiveDeviceCalls).toBe(2);
      expect(applyPlaybackStateFromServer).toHaveBeenCalledTimes(1);
      expect(applyPlaybackStateFromServer).toHaveBeenCalledWith(
        expect.objectContaining({ version: 30 }),
      );
    });

    it('when ack is not an error but not a playback state, skips apply and listPlaybackDevices', async () => {
      const apply = vi.mocked(usePlayerStore.getState().applyPlaybackStateFromServer);

      connectPlaybackSync('token');
      const callsBefore = apply.mock.calls.length;

      mockSocket.emit.mockImplementation(
        (_event: string, _data: unknown, callback: (r: EmitCallbackPayload) => void) => {
          callback({});
        },
      );

      await setActivePlaybackDevice('new-device');

      expect(apply.mock.calls.length).toBe(callsBefore);
    });
  });
});
