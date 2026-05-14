import type { StoreApi } from 'zustand';
import { mapServerPlaybackToPatch } from './player-store.map-server-state';
import type { PlayerState } from './player-store.types';

export function createPlayerServerActions(
  set: StoreApi<PlayerState>['setState'],
  get: StoreApi<PlayerState>['getState'],
): Pick<
  PlayerState,
  'applyPlaybackStateFromServer' | 'setLocalPlaybackDeviceId' | 'setPlaybackDevices'
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
    setLocalPlaybackDeviceId: (localPlaybackDeviceId) => set({ localPlaybackDeviceId }),
    setPlaybackDevices: (playbackDevices) => set({ playbackDevices }),
  };
}
