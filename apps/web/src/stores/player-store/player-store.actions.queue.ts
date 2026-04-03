import { playbackTrackToQueueItem } from '@/lib/playback/playback-mappers';
import {
  getOrderedNextQueue,
  reorderKeepingPartitions,
  shuffleArray,
} from '@/lib/playback/queue/playback-queue';
import { afterLocalPlaybackMutation } from '@/lib/playback/sync/playback-sync';
import type { StoreApi } from 'zustand';
import type { PlayerState } from './player-store.types';
import {
  flushPlaybackClaimAfterLocalMutation,
  reindexQueuePositions,
  unshuffleBaseline,
} from './player-store.utils';

export function createPlayerQueueActions(
  set: StoreApi<PlayerState>['setState'],
  get: StoreApi<PlayerState>['getState'],
): Pick<
  PlayerState,
  'setQueue' | 'toggleShuffle' | 'addToQueue' | 'removeFromQueue' | 'reorderQueue' | 'playNext'
> {
  return {
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
        flushPlaybackClaimAfterLocalMutation(get);
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
  };
}
