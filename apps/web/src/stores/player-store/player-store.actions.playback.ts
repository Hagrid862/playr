import { playbackTrackToQueueItem } from '@/lib/playback/playback-mappers';
import { getOrderedNextQueue } from '@/lib/playback/queue/playback-queue';
import type { QueueItem } from '@repo/contracts';
import { PLAYBACK_HISTORY_MAX_LENGTH } from '@repo/contracts';
import type { StoreApi } from 'zustand';
import type { PlayerState } from './player-store.types';
import { flushPlaybackClaimAfterLocalMutation, reindexQueuePositions } from './player-store.utils';

export function createPlayerPlaybackActions(
  set: StoreApi<PlayerState>['setState'],
  get: StoreApi<PlayerState>['getState'],
): Pick<
  PlayerState,
  'playTrack' | 'playQueueItem' | 'nextTrack' | 'previousTrack' | 'addToHistory'
> {
  return {
    addToHistory: (track) => {
      set((state) => {
        const newHistory = [track, ...state.history].slice(0, PLAYBACK_HISTORY_MAX_LENGTH);
        return { history: newHistory };
      });
    },

    playTrack: (track, albumRemainder) => {
      const { currentTrack, addToHistory } = get();
      const isAlbumContext = albumRemainder !== undefined;
      if (!isAlbumContext && currentTrack) {
        addToHistory(playbackTrackToQueueItem(currentTrack, { type: 'playingNext', position: 0 }));
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

      flushPlaybackClaimAfterLocalMutation(get);
    },

    playQueueItem: (queueId) => {
      const { queue, addToHistory, currentTrack, isShuffled } = get();
      const ordered = getOrderedNextQueue(queue, isShuffled);
      const index = ordered.findIndex((i) => i.queueId === queueId);
      if (index === -1) return;
      const item = ordered[index]!;

      if (currentTrack) {
        addToHistory(playbackTrackToQueueItem(currentTrack, { type: 'playingNext', position: 0 }));
      }

      const skipped = ordered.slice(0, index);
      for (const skippedItem of skipped) {
        addToHistory(skippedItem);
      }

      const after = ordered.slice(index + 1);
      const reindexed = after.map((q, i) => ({ ...q, position: i, originalPosition: i }));

      set({
        currentTrack: item.track,
        isPlaying: true,
        currentTime: 0,
        queue: reindexed,
        isShuffled,
      });

      flushPlaybackClaimAfterLocalMutation(get);
    },

    nextTrack: () => {
      const { queue, currentTrack, addToHistory, repeatMode, isShuffled } = get();
      if (!currentTrack) return;

      const ordered = getOrderedNextQueue(queue, isShuffled);
      if (ordered.length > 0) {
        const [next, ...rest] = ordered;
        addToHistory(playbackTrackToQueueItem(currentTrack, { type: 'playingNext', position: 0 }));
        set({
          currentTrack: next.track,
          queue: reindexQueuePositions(rest),
          currentTime: 0,
          isPlaying: true,
        });
        flushPlaybackClaimAfterLocalMutation(get);
        return;
      }

      if (repeatMode === 'all') {
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
        flushPlaybackClaimAfterLocalMutation(get);
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
        flushPlaybackClaimAfterLocalMutation(get);
        return;
      }

      if (repeatMode === 'all') {
        const ordered = getOrderedNextQueue(queue, isShuffled);
        if (ordered.length === 0) return;
        const last = ordered[ordered.length - 1]!;
        addToHistory(playbackTrackToQueueItem(currentTrack, { type: 'playingNext', position: 0 }));
        const rest = ordered.slice(0, -1);
        set({
          currentTrack: last.track,
          queue: rest.map((q, i) => ({ ...q, position: i })),
          currentTime: 0,
          isPlaying: true,
        });
        flushPlaybackClaimAfterLocalMutation(get);
      }
    },
  };
}
