import type { StoreApi } from 'zustand';
import {
  playerStoreAvailableQualitiesDefault,
  playerStorePlaybackInitialSlice,
  playerStorePersistedDefaults,
} from './player-store.initial-state';
import { mapServerPlaybackToPatch } from './player-store.map-server-state';
import type { PlayerState } from './player-store.types';

export function createPlayerServerActions(
  set: StoreApi<PlayerState>['setState'],
  get: StoreApi<PlayerState>['getState'],
): Pick<
  PlayerState,
  | 'applyPlaybackStateFromServer'
  | 'clearSessionPlayback'
  | 'resetForLogout'
  | 'setLocalPlaybackDeviceId'
  | 'setPlaybackDevices'
> {
  return {
    applyPlaybackStateFromServer: (state) => {
      const s = get();
      set(() =>
        mapServerPlaybackToPatch(
          {
            localPlaybackDeviceId: s.localPlaybackDeviceId,
            playbackVersion: s.playbackVersion,
            currentTime: s.currentTime,
          },
          state,
        ),
      );
    },
    clearSessionPlayback: () => {
      const { volume, quality, availableQualities, localPlaybackDeviceId } = get();
      set({
        ...playerStorePlaybackInitialSlice,
        volume,
        quality,
        availableQualities,
        localPlaybackDeviceId,
      });
    },
    resetForLogout: () =>
      set({
        ...playerStorePlaybackInitialSlice,
        ...playerStorePersistedDefaults,
        availableQualities: playerStoreAvailableQualitiesDefault,
        localPlaybackDeviceId: '',
      }),
    setLocalPlaybackDeviceId: (localPlaybackDeviceId) => set({ localPlaybackDeviceId }),
    setPlaybackDevices: (playbackDevices) => set({ playbackDevices }),
  };
}
