import { beforeEach, describe, expect, it } from 'vitest';
import { resetQueueIdSeed, testPlaybackTrack, testQueueItem } from './queue-test-fixtures';

describe('queue-test-fixtures', () => {
  beforeEach(() => {
    resetQueueIdSeed(1);
  });

  it('resetQueueIdSeed() resets the queue id counter to the default seed', () => {
    resetQueueIdSeed();
    expect(testQueueItem().queueId).toBe('01900000-0000-7000-8000-000000000001');
  });

  it('resetQueueIdSeed(seed) sets the next queue id suffix from seed', () => {
    resetQueueIdSeed(42);
    expect(testQueueItem().queueId).toBe('01900000-0000-7000-8000-000000000042');
  });

  it('testQueueItem merges track overrides into testPlaybackTrack', () => {
    const item = testQueueItem({
      track: { ...testPlaybackTrack, title: 'Override' },
      position: 3,
    });
    expect(item.track.title).toBe('Override');
    expect(item.position).toBe(3);
  });
});
