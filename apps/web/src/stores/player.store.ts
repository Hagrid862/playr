import { StreamAudioQuality, ZodTrack } from '@repo/contracts';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { idbStorage } from './idb-storage';

export type QueueItem = ZodTrack & { uniqueId: string };

export interface PlayerState {
  currentTrack: QueueItem | null;
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

  // Actions
  playTrack: (track: ZodTrack, queue?: ZodTrack[]) => void;
  pause: () => void;
  resume: () => void;
  togglePlay: () => void;
  setVolume: (volume: number) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setQuality: (quality: StreamAudioQuality | 'auto') => void;
  setAvailableQualities: (qualities: (StreamAudioQuality | 'auto')[]) => void;
  setQueue: (queue: ZodTrack[]) => void;
  nextTrack: () => void;
  previousTrack: () => void;
  toggleRepeatMode: () => void;
  toggleShuffle: () => void;
  addToQueue: (track: ZodTrack) => void;
  playNext: (track: ZodTrack) => void;
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

const toQueueItem = (track: ZodTrack): QueueItem => ({
  ...track,
  uniqueId: generateUniqueId(),
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

      addToHistory: (track) => {
        set((state) => {
          const newHistory = [track, ...state.history].slice(0, 1024);
          return { history: newHistory };
        });
      },

      playTrack: (track, queue) => {
        const { currentTrack, addToHistory } = get();
        if (currentTrack) {
          addToHistory(currentTrack);
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
      },

      pause: () => set({ isPlaying: false }),
      resume: () => set({ isPlaying: get().currentTrack !== null }),
      togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying && !!state.currentTrack })),

      isQueueOpen: false,
      sidebarView: 'queue',
      toggleQueue: () => set((state) => ({ isQueueOpen: !state.isQueueOpen })),
      setQueueOpen: (isOpen) => set({ isQueueOpen: isOpen }),
      setSidebarView: (view) => set({ sidebarView: view }),

      setVolume: (volume) => set({ volume }),
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
      toggleRepeatMode: () =>
        set((state) => {
          const modes: Array<'off' | 'all' | 'one'> = ['off', 'all', 'one'];
          const currentIndex = modes.indexOf(state.repeatMode);
          return { repeatMode: modes[(currentIndex + 1) % modes.length] };
        }),

      toggleShuffle: () =>
        set((state) => {
          if (state.isShuffled) {
            // Turn off shuffle: restore original queue
            return {
              isShuffled: false,
              queue: state.originalQueue,
              originalQueue: [],
            };
          } else {
            // Turn on shuffle
            const newQueue = shuffleArray(state.queue);
            // If there's a current track, ensure it's first
            if (state.currentTrack) {
              const currentId = state.currentTrack.uniqueId;
              const trackIndex = newQueue.findIndex((t) => t.uniqueId === currentId);
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
          }
        }),

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
          return;
        }

        const currentIndex = queue.findIndex((t) => t.uniqueId === currentTrack.uniqueId);

        if (currentIndex === -1) {
          set((state) => ({
            queue: [...state.queue, newItem],
            originalQueue: state.isShuffled
              ? [...state.originalQueue, newItem]
              : state.originalQueue,
          }));
        } else {
          const newQueue = [...queue];
          newQueue.splice(currentIndex + 1, 0, newItem);

          let newOriginalQueue = originalQueue;
          if (isShuffled) {
            const origIndex = originalQueue.findIndex((t) => t.uniqueId === currentTrack.uniqueId);
            if (origIndex > -1) {
              newOriginalQueue = [...originalQueue];
              newOriginalQueue.splice(origIndex + 1, 0, newItem);
            } else {
              newOriginalQueue = [...originalQueue, newItem];
            }
          }

          set({ queue: newQueue, originalQueue: newOriginalQueue });
        }
      },

      nextTrack: () => {
        const { queue, currentTrack, addToHistory, repeatMode } = get();
        if (!currentTrack || queue.length === 0) return;

        const currentIndex = queue.findIndex((t) => t.uniqueId === currentTrack.uniqueId);
        if (currentIndex > -1 && currentIndex < queue.length - 1) {
          addToHistory(currentTrack);
          const next = queue[currentIndex + 1];
          set({ currentTrack: next, currentTime: 0, isPlaying: true });
        } else if (repeatMode === 'all') {
          // Loop back to the start
          addToHistory(currentTrack);
          const next = queue[0];
          set({ currentTrack: next, currentTime: 0, isPlaying: true });
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

        const currentIndex = queue.findIndex((t) => t.uniqueId === currentTrack.uniqueId);
        if (currentIndex > 0) {
          addToHistory(currentTrack);
          const prev = queue[currentIndex - 1];
          set({ currentTrack: prev, currentTime: 0, isPlaying: true });
        } else if (repeatMode === 'all') {
          // Loop back to the end
          addToHistory(currentTrack);
          const prev = queue[queue.length - 1];
          set({ currentTrack: prev, currentTime: 0, isPlaying: true });
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
