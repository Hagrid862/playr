import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  connectPlaybackSync,
  disconnectPlaybackSync,
  afterLocalPlaybackMutation,
  afterLocalPlaybackMutationWithClaim,
  listPlaybackDevices,
  emitCurrentTimeSync,
  setActivePlaybackDevice,
  isPlaybackSyncConnected,
  getPlaybackSocket,
} from './playback-sync';
import { createPlaybackSocket } from './playback-socket';
import { usePlayerStore } from '@/stores/player.store';

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

const baseState = {
  setLocalPlaybackDeviceId: vi.fn(),
  applyPlaybackStateFromServer: vi.fn(),
  setPlaybackDevices: vi.fn(),
  currentTrack: { id: 'track-1', duration: 100 },
  playbackVersion: 1,
  isPlaying: true,
  currentTime: 10,
  volume: 0.5,
  repeatMode: 'off',
  isShuffled: false,
  queue: [],
  playbackFavorited: 'not-set',
  playbackInLibrary: false,
};

describe('playback-sync', () => {
  let mockSocket: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket = {
      on: vi.fn(),
      emit: vi.fn(),
      disconnect: vi.fn(),
      removeAllListeners: vi.fn(),
      connected: true,
    };
    vi.mocked(createPlaybackSocket).mockReturnValue(mockSocket);
    vi.mocked(usePlayerStore.getState).mockReturnValue({ ...baseState } as any);
  });

  afterEach(() => {
    disconnectPlaybackSync();
  });

  describe('connectPlaybackSync', () => {
    it('initializes socket and registers listeners', () => {
      connectPlaybackSync('token');

      expect(createPlaybackSocket).toHaveBeenCalled();
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('event:playback-state-updated', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('event:current-time-updated', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('exception', expect.any(Function));
    });

    it('hydrates state on connect', () => {
      connectPlaybackSync('token');
      const connectHandler = mockSocket.on.mock.calls.find((call: any) => call[0] === 'connect')[1];

      connectHandler();

      expect(mockSocket.emit).toHaveBeenCalledWith('query:get-state', {}, expect.any(Function));
      const hydrateAck = mockSocket.emit.mock.calls.find((c: any) => c[0] === 'query:get-state')[2];
      hydrateAck({ version: 1 });
      expect(usePlayerStore.getState().applyPlaybackStateFromServer).toHaveBeenCalled();

      expect(mockSocket.emit).toHaveBeenCalledWith('query:list-devices', {}, expect.any(Function));
    });

    it('applies state from server on update event', () => {
      connectPlaybackSync('token');
      const updateHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'event:playback-state-updated',
      )[1];

      const newState = { version: 2 } as any;
      updateHandler(newState);

      expect(usePlayerStore.getState().applyPlaybackStateFromServer).toHaveBeenCalledWith(newState);
    });

    it('applies current time update from server', () => {
      connectPlaybackSync('token');
      const timeHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'event:current-time-updated',
      )[1];

      // Case: Remote update - should apply both version and time
      vi.mocked(usePlayerStore.getState).mockReturnValue({
        ...baseState,
        playbackVersion: 1,
        activeDeviceId: 'other-device',
        localPlaybackDeviceId: 'this-device',
      } as any);

      timeHandler({ currentTime: 20, version: 2 });
      expect(usePlayerStore.setState).toHaveBeenCalledWith({
        playbackVersion: 2,
        currentTime: 20,
      });

      // Case: Stale update - should do nothing
      vi.mocked(usePlayerStore.getState).mockReturnValue({
        ...baseState,
        playbackVersion: 5,
        activeDeviceId: 'other-device',
        localPlaybackDeviceId: 'this-device',
      } as any);
      timeHandler({ currentTime: 20, version: 2 });
      expect(usePlayerStore.setState).toHaveBeenCalledTimes(1);

      // Case: Local update (active device) - should only update version
      vi.mocked(usePlayerStore.getState).mockReturnValue({
        ...baseState,
        playbackVersion: 1,
        activeDeviceId: 'this-device',
        localPlaybackDeviceId: 'this-device',
      } as any);

      timeHandler({ currentTime: 20, version: 2 });
      expect(usePlayerStore.setState).toHaveBeenCalledWith({
        playbackVersion: 2,
      });
    });

    it('handles connect errors and exceptions', () => {
      connectPlaybackSync('token');
      const errorHandler = mockSocket.on.mock.calls.find((call: any) => call[0] === 'connect_error')[1];
      const exceptionHandler = mockSocket.on.mock.calls.find((call: any) => call[0] === 'exception')[1];

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

    it('emits set-state if connected and track exists', () => {
      connectPlaybackSync('token');
      afterLocalPlaybackMutation();

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'command:set-state',
        expect.objectContaining({ claimActiveDevice: false }),
        expect.any(Function),
      );
    });

    it('handles set-state response', () => {
      connectPlaybackSync('token');
      afterLocalPlaybackMutation();
      const ack = mockSocket.emit.mock.calls.find((call: any) => call[0] === 'command:set-state')[2];

      const newState = { version: 3 } as any;
      ack(newState);
      expect(usePlayerStore.getState().applyPlaybackStateFromServer).toHaveBeenCalledWith(newState);
    });

    it('with claim: emits set-state with claimActiveDevice true and handles response', () => {
      connectPlaybackSync('token');
      afterLocalPlaybackMutationWithClaim(true);

      const ack = mockSocket.emit.mock.calls.find((call: any) => call[0] === 'command:set-state')[2];
      ack({ version: 10 });
      expect(usePlayerStore.getState().applyPlaybackStateFromServer).toHaveBeenCalledWith({ version: 10 });

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
      mockSocket.emit.mockImplementation((event: string, _data: any, callback: any) => {
        if (event === 'query:list-devices') {
          callback({ devices: [{ id: 'd1' }] });
        }
      });

      await listPlaybackDevices();
      expect(usePlayerStore.getState().setPlaybackDevices).toHaveBeenCalledWith([{ id: 'd1' }]);
    });
  });

  describe('emitCurrentTimeSync', () => {
    it('emits current time and handles response', async () => {
      connectPlaybackSync('token');
      mockSocket.emit.mockImplementation((event: string, _data: any, callback: any) => {
        if (event === 'command:set-current-time-state') {
          callback({ currentTime: 50, version: 10 });
        }
      });

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
      mockSocket.emit.mockImplementation((event: string, _data: any, callback: any) => {
        if (event === 'command:set-current-time-state') {
          callback({ error: 'version mismatch', code: 'CONFLICT' });
        } else if (event === 'query:get-state') {
          callback({ version: 11 });
        }
      });

      await emitCurrentTimeSync(50);
      expect(mockSocket.emit).toHaveBeenCalledWith('query:get-state', {}, expect.any(Function));
      expect(usePlayerStore.getState().applyPlaybackStateFromServer).toHaveBeenCalled();
    });
  });

  describe('setActivePlaybackDevice', () => {
    it('emits set-active-device', async () => {
      connectPlaybackSync('token');
      mockSocket.emit.mockImplementation((event: string, _data: any, callback: any) => {
        if (event === 'command:set-active-device') {
          callback({ version: 20 });
        }
      });

      await setActivePlaybackDevice('new-device');
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'command:set-active-device',
        expect.objectContaining({ deviceId: 'new-device' }),
        expect.any(Function),
      );
    });

    it('handles no playbackVersion', async () => {
      vi.mocked(usePlayerStore.getState).mockReturnValue({
        ...baseState,
        playbackVersion: 0,
      } as any);
      connectPlaybackSync('token');
      
      await setActivePlaybackDevice('new-device');
      expect(mockSocket.emit).not.toHaveBeenCalledWith('command:set-active-device', expect.any(Object), expect.any(Function));
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

    it('buildSetStateBody handles queue mapping', () => {
      vi.mocked(usePlayerStore.getState).mockReturnValue({
        ...baseState,
        currentTrack: { id: 'track-1', duration: 100 },
        queue: [{ queueId: 'q1', track: { id: 'track-1' } }],
        playbackVersion: 1,
      } as any);
      connectPlaybackSync('token');
      afterLocalPlaybackMutation();
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'command:set-state',
        expect.objectContaining({
          state: expect.objectContaining({
            queue: [expect.objectContaining({ queueId: 'q1', position: 0 })],
          }),
        }),
        expect.any(Function),
      );
    });

    it('isVersionConflict handles various message formats', async () => {
      connectPlaybackSync('token');
      mockSocket.emit.mockImplementation((event: string, _data: any, callback: any) => {
        if (event === 'command:set-current-time-state') {
          callback({ error: 'version mismatch', code: 'OTHER' });
        } else if (event === 'query:get-state') {
          callback({ version: 100 });
        }
      });
      await emitCurrentTimeSync(10);
      expect(mockSocket.emit).toHaveBeenCalledWith('query:get-state', {}, expect.any(Function));
    });

    it('isVersionConflict returns false when not a conflict', async () => {
      connectPlaybackSync('token');
      mockSocket.emit.mockImplementation((_e: string, _d: any, callback: any) => {
        callback({ error: 'general error', code: 'ERROR' });
      });
      await emitCurrentTimeSync(10);
      expect(mockSocket.emit).not.toHaveBeenCalledWith('query:get-state', expect.any(Object), expect.any(Function));
    });

    it('hydrate handles null payload', () => {
      connectPlaybackSync('token');
      const connectHandler = mockSocket.on.mock.calls.find((call: any) => call[0] === 'connect')[1];
      mockSocket.emit.mockImplementation((event: string, _data: any, callback: any) => {
        if (event === 'query:get-state') callback(null);
      });
      connectHandler();
      expect(usePlayerStore.getState().applyPlaybackStateFromServer).not.toHaveBeenCalled();
    });

    it('hydrate returns early if disconnected', () => {
      connectPlaybackSync('token');
      mockSocket.connected = false;
      const connectHandler = mockSocket.on.mock.calls.find((call: any) => call[0] === 'connect')[1];
      connectHandler();
      expect(mockSocket.emit).not.toHaveBeenCalledWith('query:get-state', expect.any(Object), expect.any(Function));
    });

    it('afterLocalPlaybackMutation returns early if no currentTrack', () => {
      vi.mocked(usePlayerStore.getState).mockReturnValue({ ...baseState, currentTrack: null } as any);
      connectPlaybackSync('token');
      afterLocalPlaybackMutation();
      expect(mockSocket.emit).not.toHaveBeenCalledWith('command:set-state', expect.any(Object), expect.any(Function));
    });

    it('afterLocalPlaybackMutationWithClaim returns early if no currentTrack', () => {
      vi.mocked(usePlayerStore.getState).mockReturnValue({ ...baseState, currentTrack: null } as any);
      connectPlaybackSync('token');
      afterLocalPlaybackMutationWithClaim(true);
      expect(mockSocket.emit).not.toHaveBeenCalledWith('command:set-state', expect.any(Object), expect.any(Function));
    });

    it('listPlaybackDevices returns early if disconnected', async () => {
      mockSocket.connected = false;
      await listPlaybackDevices();
      expect(mockSocket.emit).not.toHaveBeenCalledWith('query:list-devices', expect.any(Object), expect.any(Function));
    });

    it('emitCurrentTimeSync returns early if disconnected or invalid state', async () => {
      // Disconnected - socket is null here because connectPlaybackSync not called yet
      await emitCurrentTimeSync(10);
      expect(mockSocket.emit).not.toHaveBeenCalledWith('command:set-current-time-state', expect.any(Object), expect.any(Function));

      // Connected but invalid state
      connectPlaybackSync('token');
      
      // No track
      vi.mocked(usePlayerStore.getState).mockReturnValue({ ...baseState, currentTrack: null } as any);
      await emitCurrentTimeSync(10);
      expect(mockSocket.emit).not.toHaveBeenCalledWith('command:set-current-time-state', expect.any(Object), expect.any(Function));

      // No version
      vi.mocked(usePlayerStore.getState).mockReturnValue({ ...baseState, playbackVersion: 0 } as any);
      await emitCurrentTimeSync(10);
      expect(mockSocket.emit).not.toHaveBeenCalledWith('command:set-current-time-state', expect.any(Object), expect.any(Function));
    });

    it('emitCurrentTimeSync handles null resync payload and non-error falsy result', async () => {
      connectPlaybackSync('token');
      // Case 1: Conflict with null state payload
      mockSocket.emit.mockImplementationOnce((_e: string, _d: any, callback: any) => {
        callback({ error: 'conflict', code: 'CONFLICT' });
      }).mockImplementationOnce((_e: string, _d: any, callback: any) => {
        callback(null); // Resync payload is null
      });
      await emitCurrentTimeSync(10);
      expect(usePlayerStore.getState().applyPlaybackStateFromServer).not.toHaveBeenCalled();

      // Case 2: result is null in success path
      mockSocket.emit.mockImplementationOnce((_e: string, _d: any, callback: any) => {
        callback(null);
      });
      await emitCurrentTimeSync(10);
      expect(usePlayerStore.setState).not.toHaveBeenCalled();
    });

    it('setActivePlaybackDevice returns early if disconnected', async () => {
      mockSocket.connected = false;
      await setActivePlaybackDevice('d1');
      expect(mockSocket.emit).not.toHaveBeenCalledWith('command:set-active-device', expect.any(Object), expect.any(Function));
    });

    it('afterLocalPlaybackMutationWithClaim returns early if disconnected', () => {
      mockSocket.connected = false;
      afterLocalPlaybackMutationWithClaim(true);
      expect(mockSocket.emit).not.toHaveBeenCalledWith('command:set-state', expect.any(Object), expect.any(Function));
    });
  });
});
