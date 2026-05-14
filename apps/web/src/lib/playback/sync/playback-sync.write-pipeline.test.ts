import { createPlayerStateMock } from '@/components/app/test-utils/player-test-utils';
import { usePlayerStore } from '@/stores/player-store/player.store';
import { testQueueItem } from '@/test-utils/queue-test-fixtures';
import type { QueueItem } from '@repo/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPlaybackSocket } from '../playback-socket';
import {
  afterLocalPlaybackMutation,
  afterLocalPlaybackMutationWithClaim,
  connectPlaybackSync,
  disconnectPlaybackSync,
  syncPlayingStateToServer,
} from './playback-sync';
import { setWriteInFlight } from './playback-sync.state';
import {
  asSocketMock,
  basePlaybackSyncTestState,
  createPlaybackSocketMock,
  findEmitAck,
  flushMicrotasks,
  playbackStateFixture,
  playbackTrackStub,
  type EmitCallbackPayload,
  type PlaybackSocketMock,
} from './playback-sync.test-helpers';
import { flushWriteQueue } from './playback-sync.write-pipeline';

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

describe('playback-sync write pipeline', () => {
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

  describe('flushWriteQueue', () => {
    it('returns when a write is already in flight', () => {
      connectPlaybackSync('token');
      setWriteInFlight(true);
      flushWriteQueue();
      expect(mockSocket.emit).not.toHaveBeenCalledWith(
        'command:set-state',
        expect.any(Object),
        expect.any(Function),
      );
      setWriteInFlight(false);
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

      const newState = playbackStateFixture({ version: 3 });
      ack(newState);
      expect(usePlayerStore.getState().applyPlaybackStateFromServer).toHaveBeenCalledWith(newState);
    });

    it('set-state ack without a playback state shape skips apply but still flushes', async () => {
      connectPlaybackSync('token');
      afterLocalPlaybackMutation();
      await flushMicrotasks();
      const applyPlaybackStateFromServer = usePlayerStore.getState().applyPlaybackStateFromServer;

      const ack = findEmitAck(mockSocket.emit.mock.calls, 'command:set-state');
      ack({});

      expect(applyPlaybackStateFromServer).not.toHaveBeenCalled();
    });

    it('second scheduleFlushWriteQueue before microtask is a no-op', async () => {
      connectPlaybackSync('token');
      afterLocalPlaybackMutation();
      afterLocalPlaybackMutation();
      await flushMicrotasks();
      const setStateCalls = mockSocket.emit.mock.calls.filter(
        ([event]) => event === 'command:set-state',
      );
      expect(setStateCalls).toHaveLength(1);
      expect(setStateCalls[0]?.[1]).toEqual(expect.objectContaining({ claimActiveDevice: false }));
    });

    it('with claim: emits set-state with claimActiveDevice true and handles response', async () => {
      connectPlaybackSync('token');
      afterLocalPlaybackMutationWithClaim(true);
      await flushMicrotasks();

      const ack = findEmitAck(mockSocket.emit.mock.calls, 'command:set-state');
      ack(playbackStateFixture({ version: 10 }));
      expect(usePlayerStore.getState().applyPlaybackStateFromServer).toHaveBeenCalledWith(
        expect.objectContaining({ version: 10 }),
      );

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'command:set-state',
        expect.objectContaining({ claimActiveDevice: true }),
        expect.any(Function),
      );
    });

    it('set-state ack with non-conflict error flushes without hydrate', async () => {
      connectPlaybackSync('token');
      afterLocalPlaybackMutation();
      await flushMicrotasks();

      const setStateAck = findEmitAck(mockSocket.emit.mock.calls, 'command:set-state');
      setStateAck({ error: 'server says no', code: 'ERROR' });
      await flushMicrotasks();

      expect(mockSocket.emit).not.toHaveBeenCalledWith(
        'query:get-state',
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('skips set-state emit when pending full flush sees no currentTrack', async () => {
      connectPlaybackSync('token');
      afterLocalPlaybackMutation();

      vi.mocked(usePlayerStore.getState).mockReturnValue(
        createPlayerStateMock({
          ...basePlaybackSyncTestState,
          currentTrack: null,
          playbackVersion: 1,
        }),
      );
      await flushMicrotasks();

      expect(mockSocket.emit).not.toHaveBeenCalledWith(
        'command:set-state',
        expect.any(Object),
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
            callback(playbackStateFixture({ version: 7 }));
            return;
          }
          if (event === 'command:set-state') {
            callback(playbackStateFixture({ version: 8 }));
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

    it('conflict hydrate with null get-state skips apply then retries via merge + flush', async () => {
      connectPlaybackSync('token');
      afterLocalPlaybackMutation();
      await flushMicrotasks();

      const setStateAck = findEmitAck(mockSocket.emit.mock.calls, 'command:set-state');

      mockSocket.emit.mockImplementation(
        (event: string, _data: unknown, callback?: (r: EmitCallbackPayload) => void) => {
          if (!callback) return;
          if (event === 'query:get-state') {
            callback(null);
            return;
          }
          if (event === 'command:set-state') {
            callback(playbackStateFixture({ version: 8 }));
          }
        },
      );

      setStateAck({ error: 'Expected version mismatch.', code: 'CONFLICT' });
      await flushMicrotasks();

      expect(mockSocket.emit).toHaveBeenCalledWith('query:get-state', {}, expect.any(Function));
      expect(usePlayerStore.getState().applyPlaybackStateFromServer).toHaveBeenCalledWith(
        expect.objectContaining({ version: 8 }),
      );
    });

    it('returns early if no currentTrack', () => {
      vi.mocked(usePlayerStore.getState).mockReturnValue(
        createPlayerStateMock({ ...basePlaybackSyncTestState, currentTrack: null }),
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
        createPlayerStateMock({ ...basePlaybackSyncTestState, currentTrack: null }),
      );
      connectPlaybackSync('token');
      afterLocalPlaybackMutationWithClaim(true);
      expect(mockSocket.emit).not.toHaveBeenCalledWith(
        'command:set-state',
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

    it('set-playing-state payload uses isPlaying false from store', async () => {
      vi.mocked(usePlayerStore.getState).mockReturnValue(
        createPlayerStateMock({ ...basePlaybackSyncTestState, isPlaying: false }),
      );
      connectPlaybackSync('token');
      syncPlayingStateToServer(false);
      await flushMicrotasks();

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'command:set-playing-state',
        expect.objectContaining({ isPlaying: false, expectedVersion: 1 }),
        expect.any(Function),
      );
    });

    it('falls back to set-state when playbackVersion is 0', async () => {
      vi.mocked(usePlayerStore.getState).mockReturnValue(
        createPlayerStateMock({ ...basePlaybackSyncTestState, playbackVersion: 0 }),
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

    it('invokes set-playing-state ack through handleSyncWriteAck (playing meta)', async () => {
      connectPlaybackSync('token');
      syncPlayingStateToServer(false);
      await flushMicrotasks();

      const playingAck = findEmitAck(mockSocket.emit.mock.calls, 'command:set-playing-state');
      playingAck(playbackStateFixture({ version: 2 }));
      expect(usePlayerStore.getState().applyPlaybackStateFromServer).toHaveBeenCalledWith(
        expect.objectContaining({ version: 2 }),
      );
    });

    it('set-playing-state conflict hydrates and retries (playing meta in conflict path)', async () => {
      connectPlaybackSync('token');
      syncPlayingStateToServer(false);
      await flushMicrotasks();

      const playingAck = findEmitAck(mockSocket.emit.mock.calls, 'command:set-playing-state');
      mockSocket.emit.mockImplementation(
        (event: string, _data: unknown, callback?: (r: EmitCallbackPayload) => void) => {
          if (!callback) return;
          if (event === 'query:get-state') {
            callback(playbackStateFixture({ version: 5 }));
            return;
          }
          if (event === 'command:set-state') {
            callback(playbackStateFixture({ version: 9 }));
            return;
          }
          if (event === 'command:set-playing-state') {
            callback(playbackStateFixture({ version: 6 }));
          }
        },
      );

      playingAck({ error: 'version mismatch', code: 'CONFLICT' });
      await flushMicrotasks();

      expect(mockSocket.emit).toHaveBeenCalledWith('query:get-state', {}, expect.any(Function));
      expect(usePlayerStore.getState().applyPlaybackStateFromServer).toHaveBeenLastCalledWith(
        expect.objectContaining({ version: 9 }),
      );
    });

    it('when playing-only flush runs with playbackVersion 0, queues full snapshot instead', async () => {
      vi.mocked(usePlayerStore.getState).mockReturnValue(
        createPlayerStateMock({
          ...basePlaybackSyncTestState,
          currentTrack: playbackTrackStub('t1'),
          playbackVersion: 1,
        }),
      );
      connectPlaybackSync('token');
      syncPlayingStateToServer(false);

      vi.mocked(usePlayerStore.getState).mockReturnValue(
        createPlayerStateMock({
          ...basePlaybackSyncTestState,
          currentTrack: playbackTrackStub('t1'),
          playbackVersion: 0,
        }),
      );
      await flushMicrotasks();

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'command:set-state',
        expect.objectContaining({ claimActiveDevice: false }),
        expect.any(Function),
      );
    });

    it('when playing-only flush runs without currentTrack, defers to merge path and emits nothing', async () => {
      vi.mocked(usePlayerStore.getState).mockReturnValue(
        createPlayerStateMock({
          ...basePlaybackSyncTestState,
          currentTrack: playbackTrackStub('t1'),
          playbackVersion: 1,
        }),
      );
      connectPlaybackSync('token');
      syncPlayingStateToServer(false);

      vi.mocked(usePlayerStore.getState).mockReturnValue(
        createPlayerStateMock({
          ...basePlaybackSyncTestState,
          currentTrack: null,
          playbackVersion: 1,
        }),
      );
      await flushMicrotasks();

      expect(mockSocket.emit).not.toHaveBeenCalledWith(
        'command:set-playing-state',
        expect.any(Object),
        expect.any(Function),
      );
    });
  });

  describe('set-state payload and store-bridge coverage', () => {
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
          ...basePlaybackSyncTestState,
          currentTrack: playbackTrackStub('track-1'),
          queue: queueBefore,
          playbackVersion: 1,
        }),
      );
      connectPlaybackSync('token');
      afterLocalPlaybackMutation();

      vi.mocked(usePlayerStore.getState).mockReturnValue(
        createPlayerStateMock({
          ...basePlaybackSyncTestState,
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
          ...basePlaybackSyncTestState,
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
          ...basePlaybackSyncTestState,
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
  });
});
