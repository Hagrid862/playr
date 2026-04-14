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
          const restored = state.originalQueue.length
            ? state.originalQueue.map((q) => ({ ...q }))
            : reindexQueuePositions(getOrderedNextQueue(state.queue, false));
          return {
            isShuffled: false,
            queue: restored,
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
        if (state.isShuffled) {
          const shuffledOrdered = getOrderedNextQueue(state.queue, true);
          const baselineOrdered = state.originalQueue.length
            ? getOrderedNextQueue(state.originalQueue, false)
            : getOrderedNextQueue(state.queue, false);
          const baselineManual = baselineOrdered.filter((i) => i.type === 'queue');
          const baselinePlayingNext = baselineOrdered.filter((i) => i.type === 'playingNext');
          const newItem = playbackTrackToQueueItem(track, {
            type: 'queue',
            position: shuffledOrdered.length,
            originalPosition: baselineManual.length,
          });
          return {
            queue: [...shuffledOrdered, newItem].map((item, i) => ({
              ...item,
              position: i,
            })),
            originalQueue: reindexQueuePositions(
              reorderKeepingPartitions([...baselineManual, newItem, ...baselinePlayingNext]),
            ),
            isShuffled: true,
          };
        }

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
          ? reindexQueuePositions(state.originalQueue.filter((t) => t.queueId !== uniqueId))
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
          currentTime: 0,
          isShuffled: false,
        });
        flushPlaybackClaimAfterLocalMutation(get);
        return;
      }

      set((state) => {
        if (state.isShuffled) {
          const shuffledOrdered = getOrderedNextQueue(state.queue, true);
          const baselineOrdered = state.originalQueue.length
            ? getOrderedNextQueue(state.originalQueue, false)
            : getOrderedNextQueue(state.queue, false);
          const baselineManual = baselineOrdered.filter((i) => i.type === 'queue');
          const baselinePlayingNext = baselineOrdered.filter((i) => i.type === 'playingNext');

          return {
            queue: [newItem, ...shuffledOrdered].map((item, i) => ({
              ...item,
              position: i,
            })),
            originalQueue: reorderKeepingPartitions([
              newItem,
              ...baselineManual,
              ...baselinePlayingNext,
            ]),
            isShuffled: true,
          };
        }

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
