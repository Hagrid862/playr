import { playbackTrackToQueueItem } from '@/lib/playback-mappers';
import { getOrderedNextQueue, reorderKeepingPartitions, shuffleArray } from '@/lib/playback-queue';
import {
  afterLocalPlaybackMutation,
  afterLocalPlaybackMutationWithClaim,
  isPlaybackSyncConnected,
  syncPlayingStateToServer,
} from '@/lib/playback-sync';
import type { ListPlaybackDeviceEntry, QueueItem } from '@repo/contracts';
import {
  PLAYBACK_HISTORY_MAX_LENGTH,
  PlaybackTrack,
  StreamAudioQuality,
  type PlaybackState,
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

  playbackVersion: number;
  playbackFavorited: 'favorited' | 'disliked' | 'not-set';
  playbackInLibrary: boolean;
  activeDeviceId: string | null;
  localPlaybackDeviceId: string;
  playbackDevices: ListPlaybackDeviceEntry[];

  applyPlaybackStateFromServer: (state: PlaybackState) => void;
  setLocalPlaybackDeviceId: (deviceId: string) => void;
  setPlaybackDevices: (devices: ListPlaybackDeviceEntry[]) => void;

  playTrack: (track: PlaybackTrack, albumRemainder?: PlaybackTrack[]) => void;
  playQueueItem: (queueId: string) => void;
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

function reindexQueuePositions(queue: QueueItem[]): QueueItem[] {
  const sorted = [...queue].sort((a, b) => a.position - b.position);
  return sorted.map((item, i) => ({ ...item, position: i }));
}

function shouldClaimActiveDevice(activeDeviceId: string | null, localPlaybackDeviceId: string) {
  return (
    activeDeviceId == null || activeDeviceId === '' || activeDeviceId === localPlaybackDeviceId
  );
}

/** When editing queue structure, exit shuffle and restore the pre-shuffle snapshot. */
function unshuffleBaseline(state: Pick<PlayerState, 'queue' | 'originalQueue' | 'isShuffled'>): {
  queue: QueueItem[];
  originalQueue: QueueItem[];
  isShuffled: boolean;
} {
  if (!state.isShuffled) {
    return { queue: state.queue, originalQueue: state.originalQueue, isShuffled: false };
  }
  return {
    queue: state.originalQueue.map((q) => ({ ...q })),
    originalQueue: [],
    isShuffled: false,
  };
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
      activeDeviceId: null,
      localPlaybackDeviceId: '',
      playbackDevices: [],

      applyPlaybackStateFromServer: (state) => {
        const s = get();
        const sortedQueue = getOrderedNextQueue(state.queue, state.shuffle);
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
        const isActiveOwner =
          Boolean(s.localPlaybackDeviceId) &&
          state.activeDeviceId != null &&
          state.activeDeviceId !== '' &&
          state.activeDeviceId === s.localPlaybackDeviceId;
        const skipTime = isActiveOwner && s.playbackVersion > 0 && state.isPlaying;

        set(() => ({
          playbackVersion: state.version,
          playbackFavorited: state.favorited,
          playbackInLibrary: state.inLibrary,
          activeDeviceId: state.activeDeviceId ?? null,
          currentTrack: item,
          isPlaying: state.isPlaying,
          currentTime: skipTime ? s.currentTime : state.currentTime,
          volume: state.volume,
          repeatMode: state.repeatMode,
          isShuffled: state.shuffle,
          duration: state.trackData.duration,
          queue: sortedQueue,
          history: state.history,
        }));
      },
      setLocalPlaybackDeviceId: (localPlaybackDeviceId) => set({ localPlaybackDeviceId }),
      setPlaybackDevices: (playbackDevices) => set({ playbackDevices }),

      addToHistory: (track) => {
        set((state) => {
          const newHistory = [track, ...state.history].slice(0, PLAYBACK_HISTORY_MAX_LENGTH);
          return { history: newHistory };
        });
      },

      playTrack: (track, albumRemainder) => {
        const { currentTrack, addToHistory } = get();
        const isAlbumContext = albumRemainder !== undefined;
        // Album/list context is a new playback session: repeat-all rebuilds the queue from
        // `history` only; stale history would splice in pre-session tracks and duplicate items.
        if (!isAlbumContext && currentTrack) {
          addToHistory(
            playbackTrackToQueueItem(currentTrack, { type: 'playingNext', position: 0 }),
          );
        }

        let nextQueue: QueueItem[] = [];
        if (isAlbumContext) {
          const rest = albumRemainder.filter((t) => t.id !== track.id);
          nextQueue = rest.map((t, i) =>
            playbackTrackToQueueItem(t, {
              type: 'playingNext',
              position: i,
              originalPosition: i,
            }),
          );
        } else if (get().queue.length > 0) {
          nextQueue = get().queue;
        }

        set({
          currentTrack: track,
          isPlaying: true,
          queue: nextQueue,
          originalQueue: [],
          isShuffled: false,
          currentTime: 0,
          ...(isAlbumContext ? { history: [] } : {}),
        });

        if (isPlaybackSyncConnected()) {
          const state = get();
          afterLocalPlaybackMutationWithClaim(
            shouldClaimActiveDevice(state.activeDeviceId, state.localPlaybackDeviceId),
          );
        } else {
          afterLocalPlaybackMutationWithClaim(
            shouldClaimActiveDevice(get().activeDeviceId, get().localPlaybackDeviceId),
          );
        }
      },

      playQueueItem: (queueId) => {
        const { queue, addToHistory, currentTrack, isShuffled } = get();
        const item = queue.find((i) => i.queueId === queueId);
        if (!item) return;

        if (currentTrack) {
          addToHistory(
            playbackTrackToQueueItem(currentTrack, { type: 'playingNext', position: 0 }),
          );
        }

        const remaining = queue.filter((q) => q.queueId !== queueId);
        const reindexed = reindexQueuePositions(remaining);

        set({
          currentTrack: item.track,
          isPlaying: true,
          currentTime: 0,
          queue: reindexed,
          isShuffled,
        });

        if (isPlaybackSyncConnected()) {
          afterLocalPlaybackMutationWithClaim(
            shouldClaimActiveDevice(get().activeDeviceId, get().localPlaybackDeviceId),
          );
        } else {
          afterLocalPlaybackMutationWithClaim(
            shouldClaimActiveDevice(get().activeDeviceId, get().localPlaybackDeviceId),
          );
        }
      },

      pause: () => {
        set({ isPlaying: false });
        syncPlayingStateToServer(false);
      },
      resume: () => {
        set({ isPlaying: get().currentTrack !== null });
        if (get().currentTrack) {
          syncPlayingStateToServer(
            shouldClaimActiveDevice(get().activeDeviceId, get().localPlaybackDeviceId),
          );
        }
      },
      togglePlay: () => {
        const nextIsPlaying = !get().isPlaying && !!get().currentTrack;
        set({ isPlaying: nextIsPlaying });
        if (nextIsPlaying) {
          syncPlayingStateToServer(
            shouldClaimActiveDevice(get().activeDeviceId, get().localPlaybackDeviceId),
          );
          return;
        }
        syncPlayingStateToServer(false);
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

      setQueue: (tracks) => {
        const items = tracks.map((t, i) =>
          playbackTrackToQueueItem(t, {
            type: 'playingNext',
            position: i,
            originalPosition: i,
          }),
        );
        set({
          queue: items,
          originalQueue: [],
          isShuffled: false,
        });
        afterLocalPlaybackMutation();
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
        set((state) => {
          if (state.isShuffled) {
            return {
              isShuffled: false,
              queue: state.originalQueue.map((q) => ({ ...q })),
              originalQueue: [],
            };
          }
          const ordered = getOrderedNextQueue(state.queue, false);
          const snapshot = ordered.map((q) => ({ ...q }));
          const shuffled = shuffleArray(ordered);
          const newQueue = shuffled.map((item, i) => ({ ...item, position: i }));
          return {
            isShuffled: true,
            originalQueue: snapshot,
            queue: newQueue,
          };
        });
        afterLocalPlaybackMutation();
      },

      addToQueue: (track) => {
        set((state) => {
          const { queue: q0, originalQueue: o0, isShuffled: sh } = unshuffleBaseline(state);
          const ordered = getOrderedNextQueue(q0, false);
          const manual = ordered.filter((i) => i.type === 'queue');
          const playingNext = ordered.filter((i) => i.type === 'playingNext');
          const newItem = playbackTrackToQueueItem(track, {
            type: 'queue',
            position: manual.length,
            originalPosition: manual.length,
          });
          return {
            queue: reorderKeepingPartitions([...manual, newItem, ...playingNext]),
            originalQueue: o0,
            isShuffled: sh,
          };
        });
        afterLocalPlaybackMutation();
      },

      removeFromQueue: (uniqueId) => {
        set((state) => {
          const filtered = state.queue.filter((t) => t.queueId !== uniqueId);
          const nextOriginal = state.isShuffled
            ? state.originalQueue.filter((t) => t.queueId !== uniqueId)
            : state.originalQueue;
          return {
            queue: reindexQueuePositions(filtered),
            originalQueue: nextOriginal,
          };
        });
        afterLocalPlaybackMutation();
      },

      reorderQueue: (newQueue) => {
        set((state) => {
          if (state.isShuffled) {
            const restored = state.originalQueue.map((q) => ({ ...q }));
            const partitioned = reorderKeepingPartitions(newQueue);
            return {
              isShuffled: false,
              originalQueue: [],
              queue: reindexQueuePositions(partitioned.length ? partitioned : restored),
            };
          }
          return { queue: reindexQueuePositions(reorderKeepingPartitions(newQueue)) };
        });
        afterLocalPlaybackMutation();
      },

      playNext: (track) => {
        const { currentTrack } = get();
        const newItem = playbackTrackToQueueItem(track, {
          type: 'queue',
          position: 0,
          originalPosition: 0,
        });

        if (!currentTrack) {
          set({
            currentTrack: newItem.track,
            queue: [],
            originalQueue: [],
            isPlaying: true,
          });
          afterLocalPlaybackMutationWithClaim(
            shouldClaimActiveDevice(get().activeDeviceId, get().localPlaybackDeviceId),
          );
          return;
        }

        set((state) => {
          const { queue: q0, originalQueue: o0, isShuffled: sh } = unshuffleBaseline(state);
          const ordered = getOrderedNextQueue(q0, false);
          const manual = ordered.filter((i) => i.type === 'queue');
          const playingNext = ordered.filter((i) => i.type === 'playingNext');
          const combined = reorderKeepingPartitions([newItem, ...manual, ...playingNext]);
          return {
            queue: combined,
            originalQueue: o0,
            isShuffled: sh,
          };
        });
        afterLocalPlaybackMutation();
      },

      nextTrack: () => {
        const { queue, currentTrack, addToHistory, repeatMode, isShuffled } = get();
        if (!currentTrack) return;

        const ordered = getOrderedNextQueue(queue, isShuffled);
        if (ordered.length > 0) {
          const [next, ...rest] = ordered;
          addToHistory(
            playbackTrackToQueueItem(currentTrack, { type: 'playingNext', position: 0 }),
          );
          set({
            currentTrack: next.track,
            queue: rest.map((q, i) => ({ ...q, position: i })),
            currentTime: 0,
            isPlaying: true,
          });
          afterLocalPlaybackMutationWithClaim(
            shouldClaimActiveDevice(get().activeDeviceId, get().localPlaybackDeviceId),
          );
          return;
        }

        if (repeatMode === 'all' && ordered.length === 0) {
          const { history: hist } = get();
          if (hist.length === 0) return;

          const first = hist[hist.length - 1]!;
          const betweenNewestFirst = hist.slice(0, -1);
          const betweenChronological = [...betweenNewestFirst].reverse();
          const tailQueue: QueueItem[] = [
            ...betweenChronological.map((item, i) => ({
              ...item,
              type: 'playingNext' as const,
              position: i,
              originalPosition: i,
            })),
            playbackTrackToQueueItem(currentTrack, {
              type: 'playingNext',
              position: betweenChronological.length,
              originalPosition: betweenChronological.length,
            }),
          ];

          set({
            currentTrack: first.track,
            queue: reindexQueuePositions(tailQueue),
            history: [],
            currentTime: 0,
            isPlaying: true,
          });
          afterLocalPlaybackMutationWithClaim(
            shouldClaimActiveDevice(get().activeDeviceId, get().localPlaybackDeviceId),
          );
        }
      },

      previousTrack: () => {
        const { currentTrack, currentTime, history, repeatMode, queue, isShuffled, addToHistory } =
          get();
        if (!currentTrack) return;

        if (currentTime > 3) {
          set({ currentTime: 0 });
          return;
        }

        if (history.length > 0) {
          const [prev, ...rest] = history;
          const currentItem = playbackTrackToQueueItem(currentTrack, {
            type: 'playingNext',
            position: 0,
            originalPosition: 0,
          });
          const ordered = getOrderedNextQueue(queue, isShuffled);
          const newQueue = reindexQueuePositions([currentItem, ...ordered]);
          set({
            history: rest,
            currentTrack: prev.track,
            queue: newQueue,
            currentTime: 0,
            isPlaying: true,
          });
          afterLocalPlaybackMutationWithClaim(
            shouldClaimActiveDevice(get().activeDeviceId, get().localPlaybackDeviceId),
          );
          return;
        }

        if (repeatMode === 'all') {
          const ordered = getOrderedNextQueue(queue, isShuffled);
          if (ordered.length === 0) return;
          const last = ordered[ordered.length - 1]!;
          addToHistory(
            playbackTrackToQueueItem(currentTrack, { type: 'playingNext', position: 0 }),
          );
          const rest = ordered.slice(0, -1);
          set({
            currentTrack: last.track,
            queue: rest.map((q, i) => ({ ...q, position: i })),
            currentTime: 0,
            isPlaying: true,
          });
          afterLocalPlaybackMutationWithClaim(
            shouldClaimActiveDevice(get().activeDeviceId, get().localPlaybackDeviceId),
          );
        }
      },
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
