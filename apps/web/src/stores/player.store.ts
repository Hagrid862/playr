import { playbackTrackToQueueItem } from '@/lib/playback-mappers';
import { emitQueueCommand, isPlaybackSyncConnected } from '@/lib/playback-queue-sync';
import {
  afterLocalPlaybackMutation,
  afterLocalPlaybackMutationWithClaim,
} from '@/lib/playback-sync';
import type { PlaybackDevice, QueueItem } from '@repo/contracts';
import {
  PlaybackTrack,
  StreamAudioQuality,
  type PlaybackState,
  type SetPlaybackStateRequest,
} from '@repo/contracts';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { idbStorage } from './idb-storage';

export interface PlayerState {
  currentTrack: PlaybackTrack | null;
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  quality: StreamAudioQuality | 'auto';
  availableQualities: (StreamAudioQuality | 'auto')[];
  queue: QueueItem[];
  originalQueue: QueueItem[];
  history: QueueItem[];
  repeatMode: 'off' | 'all' | 'one';
  isShuffled: boolean;

  /** Last server `PlaybackState.version`; `0` means no document yet (client-only until first push). */
  playbackVersion: number;
  playbackFavorited: 'favorited' | 'disliked' | 'not-set';
  playbackInLibrary: boolean;
  activeDeviceId: string;
  localPlaybackDeviceId: string;
  playbackDevices: PlaybackDevice[];

  applyPlaybackStateFromServer: (state: PlaybackState) => void;
  setLocalPlaybackDeviceId: (deviceId: string) => void;
  setPlaybackDevices: (devices: PlaybackDevice[]) => void;

  // Actions
  playTrack: (track: PlaybackTrack, queue?: PlaybackTrack[]) => void;
  pause: () => void;
  resume: () => void;
  togglePlay: () => void;
  setVolume: (volume: number) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setQuality: (quality: StreamAudioQuality | 'auto') => void;
  setAvailableQualities: (qualities: (StreamAudioQuality | 'auto')[]) => void;
  setQueue: (queue: PlaybackTrack[]) => void;
  nextTrack: () => void;
  previousTrack: () => void;
  toggleRepeatMode: () => void;
  toggleShuffle: () => void;
  addToQueue: (track: PlaybackTrack) => void;
  playNext: (track: PlaybackTrack) => void;
  removeFromQueue: (uniqueId: string) => void;
  reorderQueue: (newQueue: QueueItem[]) => void;
  addToHistory: (track: QueueItem) => void;

  isQueueOpen: boolean;
  sidebarView: 'queue' | 'lyrics';
  toggleQueue: () => void;
  setQueueOpen: (isOpen: boolean) => void;
  setSidebarView: (view: 'queue' | 'lyrics') => void;
}

const toQueueItem = (track: PlaybackTrack): QueueItem => playbackTrackToQueueItem(track);

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function shouldClaimActiveDevice(activeDeviceId: string, localPlaybackDeviceId: string) {
  // Only claim output ownership when:
  // - no active output is set yet, or
  // - this session is already the active output.
  //
  // This prevents one session from "stealing" audio output ownership just by
  // resuming/playing after another session paused it.
  return !activeDeviceId || activeDeviceId === localPlaybackDeviceId;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      currentTrack: null,
      isPlaying: false,
      volume: 1,
      currentTime: 0,
      duration: 0,
      quality: 'auto',
      availableQualities: ['auto'] as (StreamAudioQuality | 'auto')[],
      queue: [],
      originalQueue: [],
      history: [],
      repeatMode: 'off',
      isShuffled: false,

      playbackVersion: 0,
      playbackFavorited: 'not-set',
      playbackInLibrary: false,
      activeDeviceId: '',
      localPlaybackDeviceId: '',
      playbackDevices: [],

      applyPlaybackStateFromServer: (state) => {
        const item = {
          id: state.trackData.id,
          title: state.trackData.title,
          artists: state.trackData.artists ?? [],
          albumArt: state.trackData.albumArt,
          albumName: state.trackData.albumName,
          albumId: state.trackData.albumId,
          duration: state.trackData.duration,
          explicit: state.trackData.explicit,
          trackId: state.trackData.trackId,
        };
        set(() => ({
          playbackVersion: state.version,
          playbackFavorited: state.favorited,
          playbackInLibrary: state.inLibrary,
          activeDeviceId: state.activeDeviceId,
          currentTrack: item,
          isPlaying: state.isPlaying,
          currentTime: state.currentTime,
          volume: state.volume,
          repeatMode: state.repeatMode,
          isShuffled: state.shuffle,
          duration: state.trackData.duration,
          // Apply server queue sorted by position
          queue: [...state.queue].sort((a, b) => a.position - b.position),
        }));
      },
      setLocalPlaybackDeviceId: (localPlaybackDeviceId) => set({ localPlaybackDeviceId }),
      setPlaybackDevices: (playbackDevices) => set({ playbackDevices }),

      addToHistory: (track) => {
        set((state) => {
          const newHistory = [track, ...state.history].slice(0, 1024);
          return { history: newHistory };
        });
      },

      playTrack: (track, queue) => {
        const { currentTrack, addToHistory, playbackVersion } = get();
        if (currentTrack) {
          addToHistory(toQueueItem(currentTrack));
        }

        const currentQueueItem = toQueueItem(track);
        const newQueue = queue ? queue.map(toQueueItem) : get().queue;

        let finalQueue = newQueue;
        let finalCurrentTrack = currentQueueItem;

        if (queue) {
          // Reconstruct queue with unique IDs
          finalQueue = queue.map(toQueueItem);
          // Ensure currentTrack matches an item in the queue by ID
          const found = finalQueue.find((t) => t.track.id === track.id);
          if (found) {
            finalCurrentTrack = found;
          } else {
            // Track not in provided queue? Prepend it.
            finalQueue = [finalCurrentTrack, ...finalQueue];
          }
        } else {
          // If no queue provided and existing queue is empty, set as only item.
          if (!get().queue.length) {
            finalQueue = [finalCurrentTrack];
          }
        }

        set({
          currentTrack: finalCurrentTrack.track,
          isPlaying: true,
          queue: finalQueue,
          originalQueue: [],
          isShuffled: false,
          currentTime: 0,
        });

        if (isPlaybackSyncConnected()) {
          // Use command:set-state for a full play operation
          const state = get();
          const claimActiveDevice = shouldClaimActiveDevice(
            state.activeDeviceId,
            state.localPlaybackDeviceId,
          );
          const payload: SetPlaybackStateRequest = {
            state: {
              deviceName: 'Web',
              deviceIcon: 'desktop',
              isPlaying: true,
              trackData: finalCurrentTrack.track,
              currentTime: 0,
              volume: state.volume,
              repeatMode: state.repeatMode,
              shuffle: false,
              queue: finalQueue.map((item, index) => ({ ...item, position: index })),
              favorited: state.playbackFavorited,
              inLibrary: state.playbackInLibrary,
            },
            expectedVersion: playbackVersion,
            claimActiveDevice,
          };
          emitQueueCommand('command:set-state', payload);
        } else {
          const state = get();
          const claimActiveDevice = shouldClaimActiveDevice(
            state.activeDeviceId,
            state.localPlaybackDeviceId,
          );
          afterLocalPlaybackMutationWithClaim(claimActiveDevice);
        }
      },

      pause: () => {
        set({ isPlaying: false });
        afterLocalPlaybackMutation();
      },
      resume: () => {
        set({ isPlaying: get().currentTrack !== null });
        if (get().currentTrack) {
          const state = get();
          const claimActiveDevice = shouldClaimActiveDevice(
            state.activeDeviceId,
            state.localPlaybackDeviceId,
          );
          afterLocalPlaybackMutationWithClaim(claimActiveDevice);
        }
      },
      togglePlay: () => {
        const nextIsPlaying = !get().isPlaying && !!get().currentTrack;
        set({ isPlaying: nextIsPlaying });
        if (nextIsPlaying) {
          const state = get();
          const claimActiveDevice = shouldClaimActiveDevice(
            state.activeDeviceId,
            state.localPlaybackDeviceId,
          );
          afterLocalPlaybackMutationWithClaim(claimActiveDevice);
          return;
        }
        afterLocalPlaybackMutation();
      },

      isQueueOpen: false,
      sidebarView: 'queue',
      toggleQueue: () => set((state) => ({ isQueueOpen: !state.isQueueOpen })),
      setQueueOpen: (isOpen) => set({ isQueueOpen: isOpen }),
      setSidebarView: (view) => set({ sidebarView: view }),

      setVolume: (volume) => {
        set({ volume });
        afterLocalPlaybackMutation();
      },
      setCurrentTime: (currentTime) => set({ currentTime }),
      setDuration: (duration) => set({ duration }),
      setQuality: (quality) => set({ quality }),
      setAvailableQualities: (availableQualities) => set({ availableQualities }),
      setQueue: (queue) => {
        const { playbackVersion } = get();
        const items = queue.map(toQueueItem);

        if (isPlaybackSyncConnected()) {
          emitQueueCommand('command:set-queue', {
            items,
            expectedVersion: playbackVersion,
          });
          return;
        }

        set({
          queue: items,
          originalQueue: [],
          isShuffled: false,
        });
      },
      toggleRepeatMode: () => {
        set((state) => {
          const modes: Array<'off' | 'all' | 'one'> = ['off', 'all', 'one'];
          const currentIndex = modes.indexOf(state.repeatMode);
          return { repeatMode: modes[(currentIndex + 1) % modes.length] };
        });
        afterLocalPlaybackMutation();
      },

      toggleShuffle: () => {
        const { isShuffled, playbackVersion } = get();
        if (isPlaybackSyncConnected()) {
          if (!isShuffled) {
            emitQueueCommand('command:shuffle-queue', { expectedVersion: playbackVersion });
          }
          emitQueueCommand('command:set-shuffle-state', {
            shuffle: !isShuffled,
            expectedVersion: playbackVersion,
          });
          return;
        }

        set((state) => {
          if (state.isShuffled) {
            return {
              isShuffled: false,
              queue: state.originalQueue,
              originalQueue: [],
            };
          }
          const newQueue = shuffleArray(state.queue);
          if (state.currentTrack) {
            const currentId = state.currentTrack.id;
            const trackIndex = newQueue.findIndex((t) => t.track.id === currentId);
            if (trackIndex > -1) {
              const [track] = newQueue.splice(trackIndex, 1);
              newQueue.unshift(track);
            }
          }
          return {
            isShuffled: true,
            originalQueue: state.queue,
            queue: newQueue,
          };
        });
        afterLocalPlaybackMutation();
      },

      addToQueue: (track) => {
        const { playbackVersion } = get();
        const newItem = toQueueItem(track);

        if (isPlaybackSyncConnected()) {
          emitQueueCommand('command:add-queue-item', {
            track: newItem,
            position: null,
            expectedVersion: playbackVersion,
          });
          return;
        }

        set((state) => {
          return {
            queue: [...state.queue, newItem],
            originalQueue: state.isShuffled
              ? [...state.originalQueue, newItem]
              : state.originalQueue,
          };
        });
      },

      removeFromQueue: (uniqueId) => {
        const { playbackVersion } = get();
        if (isPlaybackSyncConnected()) {
          emitQueueCommand('command:remove-queue-item', {
            itemId: uniqueId,
            expectedVersion: playbackVersion,
          });
          return;
        }

        set((state) => ({
          queue: state.queue.filter((t) => t.queueId !== uniqueId),
          originalQueue: state.isShuffled
            ? state.originalQueue.filter((t) => t.queueId !== uniqueId)
            : state.originalQueue,
        }));
      },

      reorderQueue: (newQueue) => {
        const { playbackVersion } = get();
        if (isPlaybackSyncConnected()) {
          emitQueueCommand('command:reorder-queue-items', {
            items: newQueue,
            expectedVersion: playbackVersion,
          });
          return;
        }

        set((state) => ({
          queue: newQueue,
          originalQueue: state.isShuffled ? state.originalQueue : [], // Reordering manually clears shuffle original queue conceptually, or we accept the new order
        }));
      },

      playNext: (track) => {
        const { currentTrack, queue, isShuffled, originalQueue, playbackVersion } = get();
        const newItem = toQueueItem(track);

        if (isPlaybackSyncConnected() && currentTrack) {
          const currentIndex = queue.findIndex((t) => t.track.id === currentTrack.id);
          emitQueueCommand('command:add-queue-item', {
            track: newItem,
            position: currentIndex + 1,
            expectedVersion: playbackVersion,
          });
          return;
        }

        if (!currentTrack) {
          set({
            currentTrack: newItem.track,
            queue: [newItem],
            originalQueue: isShuffled ? [newItem] : [],
            isPlaying: true,
          });
          const state = get();
          const claimActiveDevice = shouldClaimActiveDevice(
            state.activeDeviceId,
            state.localPlaybackDeviceId,
          );
          afterLocalPlaybackMutationWithClaim(claimActiveDevice);
          return;
        }

        const currentIndex = queue.findIndex((t) => t.track.id === currentTrack.id);

        if (currentIndex === -1) {
          set((state) => ({
            queue: [...state.queue, newItem],
            originalQueue: state.isShuffled
              ? [...state.originalQueue, newItem]
              : state.originalQueue,
          }));
          afterLocalPlaybackMutation();
        } else {
          const newQueue = [...queue];
          newQueue.splice(currentIndex + 1, 0, newItem);

          let newOriginalQueue = originalQueue;
          if (isShuffled) {
            const origIndex = originalQueue.findIndex((t) => t.track.id === currentTrack.id);
            if (origIndex > -1) {
              newOriginalQueue = [...originalQueue];
              newOriginalQueue.splice(origIndex + 1, 0, newItem);
            } else {
              newOriginalQueue = [...originalQueue, newItem];
            }
          }

          set({ queue: newQueue, originalQueue: newOriginalQueue });
          afterLocalPlaybackMutation();
        }
      },

      nextTrack: () => {
        const { queue, currentTrack, addToHistory, repeatMode } = get();
        if (!currentTrack || queue.length === 0) return;

        const currentIndex = queue.findIndex((t) => t.track.id === currentTrack.id);
        if (currentIndex > -1 && currentIndex < queue.length - 1) {
          addToHistory(toQueueItem(currentTrack));
          const next = queue[currentIndex + 1];
          set({ currentTrack: next.track, currentTime: 0, isPlaying: true });
          const state = get();
          const claimActiveDevice = shouldClaimActiveDevice(
            state.activeDeviceId,
            state.localPlaybackDeviceId,
          );
          afterLocalPlaybackMutationWithClaim(claimActiveDevice);
        } else if (repeatMode === 'all') {
          // Loop back to the start
          addToHistory(toQueueItem(currentTrack));
          const next = queue[0];
          set({ currentTrack: next.track, currentTime: 0, isPlaying: true });
          const state = get();
          const claimActiveDevice = shouldClaimActiveDevice(
            state.activeDeviceId,
            state.localPlaybackDeviceId,
          );
          afterLocalPlaybackMutationWithClaim(claimActiveDevice);
        }
      },

      previousTrack: () => {
        const { queue, currentTrack, currentTime, addToHistory, repeatMode } = get();
        if (!currentTrack || queue.length === 0) return;

        // If more than 3 seconds in, restart the track instead
        if (currentTime > 3) {
          set({ currentTime: 0 });
          return;
        }

        const currentIndex = queue.findIndex((t) => t.track.id === currentTrack.id);
        if (currentIndex > 0) {
          addToHistory(toQueueItem(currentTrack));
          const prev = queue[currentIndex - 1];
          set({ currentTrack: prev.track, currentTime: 0, isPlaying: true });
          const state = get();
          const claimActiveDevice = shouldClaimActiveDevice(
            state.activeDeviceId,
            state.localPlaybackDeviceId,
          );
          afterLocalPlaybackMutationWithClaim(claimActiveDevice);
        } else if (repeatMode === 'all') {
          // Loop back to the end
          addToHistory(toQueueItem(currentTrack));
          const prev = queue[queue.length - 1];
          set({ currentTrack: prev.track, currentTime: 0, isPlaying: true });
          const state = get();
          const claimActiveDevice = shouldClaimActiveDevice(
            state.activeDeviceId,
            state.localPlaybackDeviceId,
          );
          afterLocalPlaybackMutationWithClaim(claimActiveDevice);
        }
      },
    }),
    {
      name: 'player-storage',
      storage: idbStorage,
      partialize: (state) => ({
        volume: state.volume,
        quality: state.quality,
        history: state.history,
        currentTrack: state.currentTrack,
        repeatMode: state.repeatMode,
      }),
    },
  ),
);
