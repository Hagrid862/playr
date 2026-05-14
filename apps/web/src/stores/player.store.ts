import { afterLocalPlaybackMutation } from '@/lib/playback-sync';
import { PlaybackTrack, StreamAudioQuality, type PlaybackState } from '@repo/contracts';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { idbStorage } from './idb-storage';

export type QueueItem = PlaybackTrack & { uniqueId: string };

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

  applyPlaybackStateFromServer: (state: PlaybackState) => void;

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

const generateUniqueId = () => Math.random().toString(36).substring(2, 9);

const toQueueItem = (track: PlaybackTrack): QueueItem => ({
  uniqueId: generateUniqueId(),
  ...track,
  artists: track.artists ?? [],
});

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
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

      applyPlaybackStateFromServer: (state) => {
        const item = {
          id: state.trackData.id,
          title: state.trackData.title,
          artists: state.trackData.artists ?? [],
          albumArt: state.trackData.albumArt,
          albumName: state.trackData.albumName,
          albumId: state.trackData.albumId,
          duration: state.trackData.duration,
        };
        set({
          playbackVersion: state.version,
          playbackFavorited: state.favorited,
          playbackInLibrary: state.inLibrary,
          currentTrack: item,
          isPlaying: state.isPlaying,
          currentTime: state.currentTime,
          volume: state.volume,
          repeatMode: state.repeatMode,
          isShuffled: state.shuffle,
          duration: state.trackData.duration,
          queue: [toQueueItem(item)],
          originalQueue: [],
        });
      },

      addToHistory: (track) => {
        set((state) => {
          const newHistory = [track, ...state.history].slice(0, 1024);
          return { history: newHistory };
        });
      },

      playTrack: (track, queue) => {
        const { currentTrack, addToHistory } = get();
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
          const found = finalQueue.find((t) => t.id === track.id);
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
          currentTrack: finalCurrentTrack,
          isPlaying: true,
          queue: finalQueue,
          originalQueue: [],
          isShuffled: false,
          currentTime: 0,
        });
        afterLocalPlaybackMutation();
      },

      pause: () => {
        set({ isPlaying: false });
        afterLocalPlaybackMutation();
      },
      resume: () => {
        set({ isPlaying: get().currentTrack !== null });
        afterLocalPlaybackMutation();
      },
      togglePlay: () => {
        set((state) => ({ isPlaying: !state.isPlaying && !!state.currentTrack }));
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
      setQueue: (queue) =>
        set({
          queue: queue.map(toQueueItem),
          originalQueue: [],
          isShuffled: false,
        }),
      toggleRepeatMode: () => {
        set((state) => {
          const modes: Array<'off' | 'all' | 'one'> = ['off', 'all', 'one'];
          const currentIndex = modes.indexOf(state.repeatMode);
          return { repeatMode: modes[(currentIndex + 1) % modes.length] };
        });
        afterLocalPlaybackMutation();
      },

      toggleShuffle: () => {
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
            const trackIndex = newQueue.findIndex((t) => t.id === currentId);
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

      addToQueue: (track) =>
        set((state) => {
          const newItem = toQueueItem(track);
          return {
            queue: [...state.queue, newItem],
            originalQueue: state.isShuffled
              ? [...state.originalQueue, newItem]
              : state.originalQueue,
          };
        }),

      removeFromQueue: (uniqueId) =>
        set((state) => ({
          queue: state.queue.filter((t) => t.uniqueId !== uniqueId),
          originalQueue: state.isShuffled
            ? state.originalQueue.filter((t) => t.uniqueId !== uniqueId)
            : state.originalQueue,
        })),

      reorderQueue: (newQueue) =>
        set((state) => ({
          queue: newQueue,
          originalQueue: state.isShuffled ? state.originalQueue : [], // Reordering manually clears shuffle original queue conceptually, or we accept the new order
        })),

      playNext: (track) => {
        const { currentTrack, queue, isShuffled, originalQueue } = get();
        const newItem = toQueueItem(track);

        if (!currentTrack) {
          set({
            currentTrack: newItem,
            queue: [newItem],
            originalQueue: isShuffled ? [newItem] : [],
            isPlaying: true,
          });
          afterLocalPlaybackMutation();
          return;
        }

        const currentIndex = queue.findIndex((t) => t.id === currentTrack.id);

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
            const origIndex = originalQueue.findIndex((t) => t.id === currentTrack.id);
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

        const currentIndex = queue.findIndex((t) => t.id === currentTrack.id);
        if (currentIndex > -1 && currentIndex < queue.length - 1) {
          addToHistory(toQueueItem(currentTrack));
          const next = queue[currentIndex + 1];
          set({ currentTrack: next, currentTime: 0, isPlaying: true });
          afterLocalPlaybackMutation();
        } else if (repeatMode === 'all') {
          // Loop back to the start
          addToHistory(toQueueItem(currentTrack));
          const next = queue[0];
          set({ currentTrack: next, currentTime: 0, isPlaying: true });
          afterLocalPlaybackMutation();
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

        const currentIndex = queue.findIndex((t) => t.id === currentTrack.id);
        if (currentIndex > 0) {
          addToHistory(toQueueItem(currentTrack));
          const prev = queue[currentIndex - 1];
          set({ currentTrack: prev, currentTime: 0, isPlaying: true });
          afterLocalPlaybackMutation();
        } else if (repeatMode === 'all') {
          // Loop back to the end
          addToHistory(toQueueItem(currentTrack));
          const prev = queue[queue.length - 1];
          set({ currentTrack: prev, currentTime: 0, isPlaying: true });
          afterLocalPlaybackMutation();
        }
      },
    }),
    {
      name: 'player-storage',
      storage: idbStorage,
      partialize: (state) => ({
        volume: state.volume,
        quality: state.quality,
        queue: state.queue,
        history: state.history,
        currentTrack: state.currentTrack,
        repeatMode: state.repeatMode,
        isShuffled: state.isShuffled,
        originalQueue: state.originalQueue,
      }),
    },
  ),
);
