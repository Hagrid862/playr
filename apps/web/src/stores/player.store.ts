import { StreamAudioQuality, ZodTrack } from '@repo/contracts';
import { create } from 'zustand';

export interface PlayerState {
  currentTrack: ZodTrack | null;
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  quality: StreamAudioQuality;
  queue: ZodTrack[];

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
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  volume: 1,
  currentTime: 0,
  duration: 0,
  quality: StreamAudioQuality.standard,
  queue: [],

  playTrack: (track, queue) => {
    set({
      currentTrack: track,
      isPlaying: true,
      queue: queue || get().queue,
      currentTime: 0,
    });
  },

  pause: () => set({ isPlaying: false }),
  resume: () => set({ isPlaying: get().currentTrack !== null }),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying && !!state.currentTrack })),

  setVolume: (volume) => set({ volume }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setQuality: (quality) => set({ quality }),
  setQueue: (queue) => set({ queue }),

  nextTrack: () => {
    const { queue, currentTrack } = get();
    if (!currentTrack || queue.length === 0) return;

    const currentIndex = queue.findIndex((t) => t.id === currentTrack.id);
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

    const currentIndex = queue.findIndex((t) => t.id === currentTrack.id);
    if (currentIndex > 0) {
      const prev = queue[currentIndex - 1];
      set({ currentTrack: prev, currentTime: 0, isPlaying: true });
    }
  },
}));
