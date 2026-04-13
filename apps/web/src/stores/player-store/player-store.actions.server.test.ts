import { testQueueItem } from '@/test-utils/queue-test-fixtures';
import type { ListPlaybackDeviceEntry } from '@repo/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/playback/sync/playback-sync', () => ({
  afterLocalPlaybackMutation: vi.fn(),
  afterLocalPlaybackMutationWithClaim: vi.fn(),
  syncPlayingStateToServer: vi.fn(),
  isPlaybackSyncConnected: vi.fn(() => false),
}));

import {
  createServerPlaybackState,
  createTrack,
  getState,
  resetPlayerStore,
} from './player-store.test-helpers';
import { usePlayerStore } from './player.store';

describe('player-store.actions.server', () => {
  beforeEach(() => {
    resetPlayerStore();
  });

  describe('Server State Sync', () => {
    it('applies playback state from server', () => {
      const t1 = createTrack('t1', 'Title');
      const t2 = createTrack('t2');
      const stateFromServer = createServerPlaybackState({
        version: 10,
        favorited: 'favorited' as const,
        inLibrary: true,
        activeDeviceId: 'device-1',
        trackData: t1,
        isPlaying: true,
        currentTime: 50,
        volume: 0.8,
        repeatMode: 'all' as const,
        shuffle: true,
        queue: [
          testQueueItem({
            queueId: '01900000-0000-7000-8000-0000000000e1',
            track: t1,
            position: 1,
            originalPosition: 1,
          }),
          testQueueItem({
            queueId: '01900000-0000-7000-8000-0000000000e2',
            track: t2,
            position: 0,
            originalPosition: 0,
          }),
        ],
      });

      getState().applyPlaybackStateFromServer(stateFromServer);

      const state = getState();
      expect(state.playbackVersion).toBe(10);
      expect(state.playbackFavorited).toBe('favorited');
      expect(state.isPlaying).toBe(true);
      expect(state.currentTime).toBe(50);
      expect(state.volume).toBe(0.8);
      expect(state.repeatMode).toBe('all');
      expect(state.isShuffled).toBe(true);
      expect(state.queue[0]?.queueId).toBe('01900000-0000-7000-8000-0000000000e2');
      expect(state.queue[1]?.queueId).toBe('01900000-0000-7000-8000-0000000000e1');
    });

    it('applies history from server', () => {
      const t1 = createTrack('t1');
      const t2 = createTrack('t2');
      const histItem = testQueueItem({
        queueId: '01900000-0000-7000-8000-0000000000h1',
        track: t2,
        position: 0,
        originalPosition: 0,
        type: 'playingNext',
      });
      const stateFromServer = createServerPlaybackState({
        version: 3,
        trackData: t1,
        isPlaying: true,
        currentTime: 0,
        queue: [],
        history: [histItem],
      });

      getState().applyPlaybackStateFromServer(stateFromServer);

      expect(getState().history).toHaveLength(1);
      expect(getState().history[0]?.track.id).toBe('t2');
    });

    it('preserves local currentTime for active audio owner when server sends different time while playing', () => {
      const t1 = createTrack('t1', 'Title');
      const t2 = createTrack('t2');
      const t3 = createTrack('t3');

      usePlayerStore.setState({
        localPlaybackDeviceId: 'this-device',
        playbackVersion: 5,
        currentTime: 42,
        currentTrack: t1,
        isPlaying: true,
      });

      const stateFromServer = createServerPlaybackState({
        version: 6,
        activeDeviceId: 'this-device',
        trackData: t1,
        isPlaying: true,
        currentTime: 1,
        queue: [
          testQueueItem({
            queueId: '01900000-0000-7000-8000-0000000000f1',
            track: t2,
            position: 0,
            originalPosition: 0,
          }),
          testQueueItem({
            queueId: '01900000-0000-7000-8000-0000000000f2',
            track: t3,
            position: 1,
            originalPosition: 1,
          }),
        ],
      });

      getState().applyPlaybackStateFromServer(stateFromServer);

      expect(getState().currentTime).toBe(42);
      expect(getState().playbackVersion).toBe(6);
      expect(getState().queue).toHaveLength(2);
    });

    it('sets local device metadata', () => {
      getState().setLocalPlaybackDeviceId('my-device');
      expect(getState().localPlaybackDeviceId).toBe('my-device');

      const device: ListPlaybackDeviceEntry = {
        id: 'd1',
        name: 'D1',
        icon: 'desktop',
        isActive: true,
        isCurrentDevice: true,
      };
      getState().setPlaybackDevices([device]);
      expect(getState().playbackDevices).toEqual([device]);
    });
  });
});
