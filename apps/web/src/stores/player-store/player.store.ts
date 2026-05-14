import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { idbStorage } from '../idb-storage';
import { createPlayerPlaybackActions } from './player-store.actions.playback';
import { createPlayerQueueActions } from './player-store.actions.queue';
import { createPlayerServerActions } from './player-store.actions.server';
import { createPlayerTransportActions } from './player-store.actions.transport';
import { createPlayerUiActions } from './player-store.actions.ui';
import {
  playerStoreAvailableQualitiesDefault,
  playerStorePlaybackInitialSlice,
  playerStorePersistedDefaults,
} from './player-store.initial-state';
import type { PlayerState } from './player-store.types';

export type { PlayerState } from './player-store.types';

const playerStoreInitialState: Pick<
  PlayerState,
  | 'currentTrack'
  | 'isPlaying'
  | 'volume'
  | 'currentTime'
  | 'duration'
  | 'quality'
  | 'availableQualities'
  | 'queue'
  | 'originalQueue'
  | 'history'
  | 'repeatMode'
  | 'isShuffled'
  | 'playbackVersion'
  | 'playbackFavorited'
  | 'playbackInLibrary'
  | 'activeDeviceId'
  | 'localPlaybackDeviceId'
  | 'playbackDevices'
  | 'isQueueOpen'
  | 'sidebarView'
> = {
  ...playerStorePlaybackInitialSlice,
  ...playerStorePersistedDefaults,
  availableQualities: playerStoreAvailableQualitiesDefault,
  localPlaybackDeviceId: '',
};

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      ...playerStoreInitialState,
      ...createPlayerServerActions(set, get),
      ...createPlayerPlaybackActions(set, get),
      ...createPlayerQueueActions(set, get),
      ...createPlayerTransportActions(set, get),
      ...createPlayerUiActions(set),
    }),
    {
      name: 'player-storage',
      storage: idbStorage,
      partialize: (state) => ({
        volume: state.volume,
        quality: state.quality,
        currentTrack: state.currentTrack,
        repeatMode: state.repeatMode,
      }),
    },
  ),
);
