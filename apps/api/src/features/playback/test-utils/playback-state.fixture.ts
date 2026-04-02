import type { PlaybackState, PlaybackTrack, QueueItem } from '@repo/contracts';

export const fixtureTrack: PlaybackTrack = {
  id: 'track-1',
  title: 'Track',
  trackId: 'track-1',
  artists: ['Artist'],
  albumName: 'Album',
  albumId: 'album-1',
  albumArt: null,
  duration: 180,
  explicit: false,
};

export function fixtureQueueItem(overrides: Partial<QueueItem> = {}): QueueItem {
  return {
    queueId: '01900000-0000-7000-8000-000000000001',
    track: fixtureTrack,
    position: 0,
    type: 'queue',
    originalPosition: 0,
    ...overrides,
  };
}

export function playbackStateFixture(overrides: Partial<PlaybackState> = {}): PlaybackState {
  return {
    userId: 'user-1',
    activeDeviceId: 'device-1',
    devices: [],
    isPlaying: false,
    trackData: fixtureTrack,
    currentTime: 0,
    queue: [],
    history: [],
    volume: 1,
    repeatMode: 'off',
    shuffle: false,
    favorited: 'not-set',
    inLibrary: false,
    version: 1,
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}
