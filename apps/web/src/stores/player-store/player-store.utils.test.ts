import { testQueueItem } from '@/test-utils/queue-test-fixtures';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/playback-sync', () => ({
  afterLocalPlaybackMutation: vi.fn(),
  afterLocalPlaybackMutationWithClaim: vi.fn(),
  syncPlayingStateToServer: vi.fn(),
  isPlaybackSyncConnected: vi.fn(() => false),
}));

import { createTrack, resetPlayerStore } from './player-store.test-helpers';
import {
  reindexQueuePositions,
  shouldClaimActiveDevice,
  unshuffleBaseline,
} from './player-store.utils';

describe('player-store.utils', () => {
  beforeEach(() => {
    resetPlayerStore();
  });

  describe('reindexQueuePositions', () => {
    it('assigns contiguous position and originalPosition', () => {
      const t1 = createTrack('1');
      const t2 = createTrack('2');
      const q = [
        testQueueItem({ track: t1, position: 5, originalPosition: 9 }),
        testQueueItem({ track: t2, position: 2, originalPosition: 1 }),
      ];
      const next = reindexQueuePositions(q);
      expect(next[0]).toMatchObject({ position: 0, originalPosition: 0 });
      expect(next[1]).toMatchObject({ position: 1, originalPosition: 1 });
    });
  });

  describe('shouldClaimActiveDevice', () => {
    it('returns true when active device is null, empty, or matches local', () => {
      expect(shouldClaimActiveDevice(null, 'a')).toBe(true);
      expect(shouldClaimActiveDevice('', 'a')).toBe(true);
      expect(shouldClaimActiveDevice('a', 'a')).toBe(true);
    });

    it('returns false when another device is active', () => {
      expect(shouldClaimActiveDevice('other', 'local')).toBe(false);
    });
  });

  describe('unshuffleBaseline', () => {
    it('returns state unchanged when not shuffled', () => {
      const t = createTrack('1');
      const queue = [testQueueItem({ track: t })];
      const result = unshuffleBaseline({
        isShuffled: false,
        queue,
        originalQueue: [],
      });
      expect(result.isShuffled).toBe(false);
      expect(result.queue).toBe(queue);
      expect(result.originalQueue).toEqual([]);
    });

    it('restores originalQueue into queue and clears shuffle', () => {
      const t1 = createTrack('1');
      const t2 = createTrack('2');
      const original = [
        testQueueItem({ queueId: 'o1', track: t1 }),
        testQueueItem({ queueId: 'o2', track: t2 }),
      ];
      const shuffledView = [original[1]!, original[0]!];
      const result = unshuffleBaseline({
        isShuffled: true,
        queue: shuffledView,
        originalQueue: original,
      });
      expect(result.isShuffled).toBe(false);
      expect(result.originalQueue).toEqual([]);
      expect(result.queue.map((i) => i.queueId)).toEqual(['o1', 'o2']);
    });
  });
});
