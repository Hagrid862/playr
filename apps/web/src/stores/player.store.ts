import { StreamAudioQuality, ZodTrack } from '@repo/contracts';
import { create } from 'zustand';

export type QueueItem = ZodTrack & { uniqueId: string };

export interface PlayerState {
  currentTrack: QueueItem | null;
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  quality: StreamAudioQuality;
  queue: QueueItem[];

  // Actions
  playTrack: (track: ZodTrack, queue?: ZodTrack[]) => void;
  pause: () => void;
  resume: () => void;
  togglePlay: () => void;
  setVolume: (volume: number) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setQuality: (quality: StreamAudioQuality) => void;
  setQueue: (queue: ZodTrack[]) => void;
  nextTrack: () => void;
  previousTrack: () => void;
  addToQueue: (track: ZodTrack) => void;
  playNext: (track: ZodTrack) => void;
  removeFromQueue: (uniqueId: string) => void;

  isQueueOpen: boolean;
  toggleQueue: () => void;
  setQueueOpen: (isOpen: boolean) => void;
}

const generateUniqueId = () => Math.random().toString(36).substring(2, 9);

const toQueueItem = (track: ZodTrack): QueueItem => ({
  ...track,
  uniqueId: generateUniqueId(),
});

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  volume: 1,
  currentTime: 0,
  duration: 0,
  quality: StreamAudioQuality.standard,
  queue: [],

  playTrack: (track, queue) => {
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
      currentTime: 0,
    });
  },

  pause: () => set({ isPlaying: false }),
  resume: () => set({ isPlaying: get().currentTrack !== null }),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying && !!state.currentTrack })),

  isQueueOpen: false,
  toggleQueue: () => set((state) => ({ isQueueOpen: !state.isQueueOpen })),
  setQueueOpen: (isOpen) => set({ isQueueOpen: isOpen }),

  setVolume: (volume) => set({ volume }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setQuality: (quality) => set({ quality }),
  setQueue: (queue) => set({ queue: queue.map(toQueueItem) }),

  addToQueue: (track) => set((state) => ({ queue: [...state.queue, toQueueItem(track)] })),

  removeFromQueue: (uniqueId) =>
    set((state) => ({
      queue: state.queue.filter((t) => t.uniqueId !== uniqueId),
    })),

  playNext: (track) => {
    const { currentTrack, queue } = get();
    const newItem = toQueueItem(track);

    if (!currentTrack) {
      set({ currentTrack: newItem, queue: [newItem], isPlaying: true });
      return;
    }

    const currentIndex = queue.findIndex((t) => t.uniqueId === currentTrack.uniqueId);

    if (currentIndex === -1) {
      // Current track playing but not in queue (weird state), append to end
      set((state) => ({ queue: [...state.queue, newItem] }));
    } else {
      const newQueue = [...queue];
      newQueue.splice(currentIndex + 1, 0, newItem);
      set({ queue: newQueue });
    }
  },

  nextTrack: () => {
    const { queue, currentTrack } = get();
    if (!currentTrack || queue.length === 0) return;

    const currentIndex = queue.findIndex((t) => t.uniqueId === currentTrack.uniqueId);
    if (currentIndex > -1 && currentIndex < queue.length - 1) {
      const next = queue[currentIndex + 1];
      set({ currentTrack: next, currentTime: 0, isPlaying: true });
    }
  },

  previousTrack: () => {
    const { queue, currentTrack, currentTime } = get();
    if (!currentTrack || queue.length === 0) return;

    // If more than 3 seconds in, restart the track instead
    if (currentTime > 3) {
      set({ currentTime: 0 });
      return;
    }

    const currentIndex = queue.findIndex((t) => t.uniqueId === currentTrack.uniqueId);
    if (currentIndex > 0) {
      const prev = queue[currentIndex - 1];
      set({ currentTrack: prev, currentTime: 0, isPlaying: true });
    }
  },
}));
