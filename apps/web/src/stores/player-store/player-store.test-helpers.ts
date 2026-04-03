import { zodTrackToPlaybackTrack } from '@/lib/playback/playback-mappers';
import type { PlaybackTrack, ZodTrack } from '@repo/contracts';
import { trackBuilder } from '@repo/testing/builders';
import { usePlayerStore } from './player.store';

export const getState = () => usePlayerStore.getState();

export function createTrack(id: string, title = 'Test Track'): PlaybackTrack {
  return zodTrackToPlaybackTrack(
    trackBuilder({ id, title, visibility: 'public', albumId: 'test-album' }) as ZodTrack,
  );
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
