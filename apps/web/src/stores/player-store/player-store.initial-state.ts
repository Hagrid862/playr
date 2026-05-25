import type { StreamAudioQuality } from '@repo/contracts';
import type { PlayerState } from './player-store.types';

/** Default playback slice for new sessions, logout reset, and cleared server session. */
export const playerStorePlaybackInitialSlice: Pick<
  PlayerState,
  | 'currentTrack'
  | 'isPlaying'
  | 'currentTime'
  | 'duration'
  | 'queue'
  | 'originalQueue'
  | 'listHeadTrackIds'
  | 'history'
  | 'repeatMode'
  | 'isShuffled'
  | 'playbackVersion'
  | 'playbackFavorited'
  | 'playbackInLibrary'
  | 'activeDeviceId'
  | 'playbackDevices'
  | 'isQueueOpen'
  | 'sidebarView'
> = {
  currentTrack: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  queue: [],
  originalQueue: [],
  listHeadTrackIds: [],
  history: [],
  repeatMode: 'off',
  isShuffled: false,
  playbackVersion: 0,
  playbackFavorited: 'not-set',
  playbackInLibrary: false,
  activeDeviceId: null,
  playbackDevices: [],
  isQueueOpen: false,
  sidebarView: 'queue',
};

export const playerStorePersistedDefaults: Pick<
  PlayerState,
  'volume' | 'quality' | 'currentTrack' | 'repeatMode'
> = {
  volume: 1,
  quality: 'auto',
  currentTrack: null,
  repeatMode: 'off',
};

export const playerStoreAvailableQualitiesDefault: (StreamAudioQuality | 'auto')[] = ['auto'];
