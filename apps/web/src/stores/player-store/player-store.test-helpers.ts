import { vi } from 'vitest';

/** Avoid real IndexedDB in unit tests; keeps persist from leaking across runs. */
vi.mock('../idb-storage', () => ({
  idbStorage: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  },
}));

import { zodTrackToPlaybackTrack } from '@/lib/playback/playback-mappers';
import type { PlaybackState, PlaybackTrack, ZodTrack } from '@repo/contracts';
import { trackBuilder } from '@repo/testing/builders';
import { usePlayerStore } from './player.store';

export const getState = () => usePlayerStore.getState();

export function createTrack(id: string, title = 'Test Track'): PlaybackTrack {
  return zodTrackToPlaybackTrack(
    trackBuilder({ id, title, visibility: 'public', albumId: 'test-album' }) as ZodTrack,
  );
}

/** Full `PlaybackState` for tests (e.g. `applyPlaybackStateFromServer`, `mapServerPlaybackToPatch`). */
export function createServerPlaybackState(overrides: Partial<PlaybackState> = {}): PlaybackState {
  return {
    userId: 'u1',
    version: 1,
    devices: [],
    favorited: 'not-set',
    inLibrary: false,
    activeDeviceId: null,
    trackData: createTrack('default-track'),
    isPlaying: false,
    currentTime: 0,
    volume: 1,
    repeatMode: 'off',
    shuffle: false,
    updatedAt: new Date().toISOString(),
    queue: [],
    history: [],
    ...overrides,
  };
}

export function resetPlayerStore(): void {
  usePlayerStore.setState({
    currentTrack: null,
    isPlaying: false,
    volume: 1,
    currentTime: 0,
    duration: 0,
    quality: 'auto',
    availableQualities: ['auto'],
    queue: [],
    originalQueue: [],
    listHeadTrackIds: [],
    history: [],
    repeatMode: 'off',
    isShuffled: false,
    isQueueOpen: false,
    sidebarView: 'queue',
    playbackVersion: 0,
    playbackFavorited: 'not-set',
    playbackInLibrary: false,
    activeDeviceId: null,
    localPlaybackDeviceId: '',
    playbackDevices: [],
  });
}
