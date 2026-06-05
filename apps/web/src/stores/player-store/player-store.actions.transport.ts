import { bumpListenHistoryRefresh } from '@/lib/playback/listen-history-refresh';
import {
  afterLocalPlaybackMutation,
  syncPlayingStateToServer,
} from '@/lib/playback/sync/playback-sync';
import type { StoreApi } from 'zustand';
import type { PlayerState } from './player-store.types';
import { shouldClaimActiveDevice } from './player-store.utils';

export function createPlayerTransportActions(
  set: StoreApi<PlayerState>['setState'],
  get: StoreApi<PlayerState>['getState'],
): Pick<
  PlayerState,
  | 'pause'
  | 'resume'
  | 'togglePlay'
  | 'setVolume'
  | 'setCurrentTime'
  | 'setDuration'
  | 'setQuality'
  | 'setAvailableQualities'
  | 'toggleRepeatMode'
> {
  return {
    pause: () => {
      set({ isPlaying: false });
      syncPlayingStateToServer(false);
    },
    resume: () => {
      const { currentTrack, activeDeviceId, localPlaybackDeviceId, currentTime } = get();
      set({ isPlaying: currentTrack !== null });
      if (currentTrack) {
        syncPlayingStateToServer(shouldClaimActiveDevice(activeDeviceId, localPlaybackDeviceId));
        if (currentTime <= 5) {
          bumpListenHistoryRefresh();
        }
      }
    },
    togglePlay: () => {
      const { isPlaying, currentTrack, activeDeviceId, localPlaybackDeviceId, currentTime } = get();
      const nextIsPlaying = !isPlaying && !!currentTrack;
      set({ isPlaying: nextIsPlaying });
      if (nextIsPlaying) {
        syncPlayingStateToServer(shouldClaimActiveDevice(activeDeviceId, localPlaybackDeviceId));
        if (currentTime <= 5) {
          bumpListenHistoryRefresh();
        }
        return;
      }
      syncPlayingStateToServer(false);
    },
    setVolume: (volume) => {
      set({ volume });
      afterLocalPlaybackMutation();
    },
    setCurrentTime: (currentTime) => set({ currentTime }),
    setDuration: (duration) => set({ duration }),
    setQuality: (quality) => set({ quality }),
    setAvailableQualities: (availableQualities) => set({ availableQualities }),
    toggleRepeatMode: () => {
      set((state) => {
        const modes: Array<'off' | 'all' | 'one'> = ['off', 'all', 'one'];
        const currentIndex = modes.indexOf(state.repeatMode);
        return { repeatMode: modes[(currentIndex + 1) % modes.length] };
      });
      afterLocalPlaybackMutation();
    },
  };
}
