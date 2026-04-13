import type { PlaybackState, PlaybackTrack, QueueItem } from '@repo/contracts';

const FIXTURE_UPDATED_AT = '2026-01-01T00:00:00.000Z';

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

function cloneFixtureTrack(): PlaybackTrack {
  return {
    ...fixtureTrack,
    artists: [...fixtureTrack.artists],
  };
}

export function fixtureQueueItem(overrides: Partial<QueueItem> = {}): QueueItem {
  return {
    queueId: '01900000-0000-6000-8000-000000000001',
    track: cloneFixtureTrack(),
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
    trackData: cloneFixtureTrack(),
    currentTime: 0,
    queue: [],
    history: [],
    volume: 1,
    repeatMode: 'off',
    shuffle: false,
    favorited: 'not-set',
    inLibrary: false,
    version: 1,
    updatedAt: FIXTURE_UPDATED_AT,
    ...overrides,
  };
}
