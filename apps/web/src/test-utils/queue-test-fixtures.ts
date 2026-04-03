import type { PlaybackTrack, QueueItem } from '@repo/contracts';

export const testPlaybackTrack: PlaybackTrack = {
  id: 'track-1',
  trackId: 'track-1',
  title: 'Test Song',
  artists: ['Artist A'],
  albumArt: null,
  albumName: 'Album A',
  albumId: 'album-1',
  duration: 100,
  explicit: false,
};

let queueIdSeed = 1;
function nextQueueId(): string {
  const suffix = String(queueIdSeed++).padStart(12, '0');
  return `01900000-0000-7000-8000-${suffix}`;
}

export function testQueueItem(overrides: Partial<QueueItem> = {}): QueueItem {
  const { track: trackOverrides, ...rest } = overrides;
  const track = { ...testPlaybackTrack, ...trackOverrides };
  return {
    queueId: nextQueueId(),
    position: 0,
    originalPosition: 0,
    type: 'queue',
    ...rest,
    track,
  };
}
