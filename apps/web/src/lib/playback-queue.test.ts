import type { QueueItem } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { testPlaybackTrack, testQueueItem } from '../test-utils/queue-test-fixtures';
import { getOrderedNextQueue, reorderKeepingPartitions } from './playback-queue';

let queueIdSeq = 0;
function item(overrides: Partial<QueueItem> & Pick<QueueItem, 'type' | 'position'>): QueueItem {
  queueIdSeq += 1;
  return testQueueItem({
    queueId: `01900000-0000-7000-8000-${String(1000 + queueIdSeq).padStart(12, '0')}`,
    track: { ...testPlaybackTrack, id: `track-${overrides.position}-${queueIdSeq}` },
    ...overrides,
  });
}

describe('playback-queue', () => {
  describe('getOrderedNextQueue', () => {
    it('unshuffled: manual queue partition before playingNext, each sorted by position', () => {
      const queue: QueueItem[] = [
        item({ type: 'playingNext', position: 0 }),
        item({ type: 'queue', position: 1 }),
        item({ type: 'queue', position: 0 }),
        item({ type: 'playingNext', position: 1 }),
      ];
      const ordered = getOrderedNextQueue(queue, false);
      expect(ordered.map((i) => i.type)).toEqual(['queue', 'queue', 'playingNext', 'playingNext']);
      expect(ordered.map((i) => i.position)).toEqual([0, 1, 0, 1]);
    });

    it('shuffled: single list sorted by position only', () => {
      const queue: QueueItem[] = [
        item({ type: 'playingNext', position: 2 }),
        item({ type: 'queue', position: 0 }),
        item({ type: 'queue', position: 1 }),
      ];
      const ordered = getOrderedNextQueue(queue, true);
      expect(ordered.map((i) => i.position)).toEqual([0, 1, 2]);
    });
  });

  describe('reorderKeepingPartitions', () => {
    it('reindexes positions within each partition', () => {
      const reordered = reorderKeepingPartitions([
        item({ type: 'playingNext', position: 5 }),
        item({ type: 'queue', position: 99 }),
        item({ type: 'queue', position: 0 }),
        item({ type: 'playingNext', position: 1 }),
      ]);
      const manual = reordered.filter((i) => i.type === 'queue');
      const next = reordered.filter((i) => i.type === 'playingNext');
      expect(manual.map((i) => i.position)).toEqual([0, 1]);
      expect(next.map((i) => i.position)).toEqual([0, 1]);
      expect(manual.map((i) => i.originalPosition)).toEqual([0, 1]);
      expect(next.map((i) => i.originalPosition)).toEqual([0, 1]);
    });
  });
});
