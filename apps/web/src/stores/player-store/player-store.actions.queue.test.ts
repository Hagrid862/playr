import { testQueueItem } from '@/test-utils/queue-test-fixtures';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/playback/sync/playback-sync', () => ({
  afterLocalPlaybackMutation: vi.fn(),
  afterLocalPlaybackMutationWithClaim: vi.fn(),
  syncPlayingStateToServer: vi.fn(),
  isPlaybackSyncConnected: vi.fn(() => false),
}));

import { createTrack, getState, resetPlayerStore } from './player-store.test-helpers';
import { usePlayerStore } from './player.store';

describe('player-store.actions.queue', () => {
  beforeEach(() => {
    resetPlayerStore();
  });

  describe('Queue Management', () => {
    it('sets queue directly', () => {
      const tracks = [createTrack('1'), createTrack('2')];
      getState().setQueue(tracks);

      const state = getState();
      expect(state.queue.length).toBe(2);
      expect(state.queue[0]?.queueId).toBeDefined();
      expect(state.isShuffled).toBe(false);
      expect(state.originalQueue).toEqual([]);
    });

    it('adds to queue (not shuffled)', () => {
      getState().setQueue([createTrack('1')]);
      expect(getState().queue.length).toBe(1);

      getState().addToQueue(createTrack('2'));
      const state = getState();
      expect(state.queue.length).toBe(2);
      expect([...state.queue.map((i) => i.track.id)].sort()).toEqual(['1', '2']);
    });

    it('removes from queue', () => {
      getState().setQueue([createTrack('1'), createTrack('2')]);
      const uniqueIdToRemove = getState().queue[1]?.queueId;

      getState().removeFromQueue(uniqueIdToRemove!);
      expect(getState().queue.length).toBe(1);
      expect(getState().queue[0]?.track.id).toBe('1');
    });

    it('reorders queue', () => {
      getState().setQueue([createTrack('1'), createTrack('2')]);
      const q = getState().queue;
      const reversed = [q[1]!, q[0]!];

      getState().reorderQueue(reversed);
      const state = getState();
      expect(state.queue.map((i) => i.track.id)).toEqual(reversed.map((i) => i.track.id));
      expect(state.queue.map((i) => i.position)).toEqual([0, 1]);
      expect(state.queue.map((i) => i.originalPosition)).toEqual([0, 1]);
    });

    it('playQueueItem jumps to clicked track, drops earlier next-up, and records skips in history', () => {
      getState().setQueue([createTrack('1'), createTrack('2'), createTrack('3'), createTrack('5')]);
      const q = getState().queue;
      const id3 = q.find((x) => x.track.id === '3')!.queueId;

      getState().playQueueItem(id3);

      expect(getState().currentTrack?.id).toBe('3');
      expect(getState().queue.map((x) => x.track.id)).toEqual(['5']);
      const histIds = getState().history.map((h) => h.track.id);
      expect(histIds).toContain('1');
      expect(histIds).toContain('2');
    });

    it('repeat all after skip-ahead replays full list order via history', () => {
      getState().setQueue([createTrack('1'), createTrack('2'), createTrack('3'), createTrack('5')]);
      getState().toggleRepeatMode();

      const id3 = getState().queue.find((x) => x.track.id === '3')!.queueId;
      getState().playQueueItem(id3);

      getState().nextTrack();
      expect(getState().currentTrack?.id).toBe('5');

      getState().nextTrack();
      expect(getState().currentTrack?.id).toBe('1');
      expect(getState().queue.map((q) => q.track.id)).toEqual(['2', '3', '5']);
    });
  });

  describe('Play Next', () => {
    it('plays next when queue is empty', () => {
      getState().playNext(createTrack('1'));
      expect(getState().currentTrack?.id).toBe('1');
      expect(getState().queue.length).toBe(0);
      expect(getState().isPlaying).toBe(true);
    });

    it('inserts it right after current track', () => {
      getState().playTrack(createTrack('1'), [createTrack('1'), createTrack('3')]);
      getState().playNext(createTrack('2'));

      const q = getState().queue;
      expect(q.length).toBe(2);
      expect(q[0]?.track.id).toBe('2');
      expect(q[1]?.track.id).toBe('3');
    });

    it('appends it if current track is not found in queue (weird state)', () => {
      getState().setQueue([createTrack('2')]);
      usePlayerStore.setState({
        currentTrack: { ...createTrack('1') },
        queue: [
          testQueueItem({
            queueId: '01900000-0000-7000-8000-0000000000c1',
            track: createTrack('1'),
          }),
        ],
      });

      getState().playNext(createTrack('3'));
      const state = getState();
      expect(state.queue[0]?.track.id).toBe('3');
    });
  });

  describe('Shuffle', () => {
    it('toggles shuffle on and off preserving original queue', () => {
      const q = [createTrack('1'), createTrack('2'), createTrack('3')];
      getState().playTrack(q[0]!, q);

      expect(getState().isShuffled).toBe(false);
      const preShuffleOrder = getState().queue.map((i) => i.track.id);

      getState().toggleShuffle();
      let state = getState();
      expect(state.isShuffled).toBe(true);
      expect(state.originalQueue.length).toBe(2);
      expect(state.queue.length).toBe(2);

      getState().toggleShuffle();
      state = getState();
      expect(state.isShuffled).toBe(false);
      expect(state.queue.map((i) => i.track.id)).toEqual(preShuffleOrder);
      expect(state.originalQueue).toEqual([]);
    });

    it('handles adding to queue while shuffled', () => {
      const q = [createTrack('1'), createTrack('2')];
      getState().playTrack(q[0]!, q);
      getState().toggleShuffle();

      getState().addToQueue(createTrack('3'));
      const state = getState();

      expect(state.queue.length).toBe(2);
      expect(state.isShuffled).toBe(true);
      expect(state.queue.map((i) => i.track.id).sort()).toEqual(['2', '3']);
      expect(state.originalQueue.map((i) => i.track.id)).toEqual(['3', '2']);
    });

    it('handles adding to queue while shuffled when original snapshot is empty', () => {
      const q = [createTrack('1'), createTrack('2')];
      getState().playTrack(q[0]!, q);
      getState().toggleShuffle();
      usePlayerStore.setState({ originalQueue: [] });

      getState().addToQueue(createTrack('3'));
      const state = getState();

      expect(state.isShuffled).toBe(true);
      expect(state.queue.map((i) => i.track.id).sort()).toEqual(['2', '3']);
      expect(state.originalQueue.map((i) => i.track.id)).toEqual(['3', '2']);
      expect(state.originalQueue.map((i) => i.position)).toEqual([0, 1]);
    });

    it('handles removing from queue while shuffled', () => {
      const q = [createTrack('1'), createTrack('2')];
      getState().playTrack(q[0]!, q);
      getState().toggleShuffle();

      const item2 = getState().queue.find((x) => x.track.id === '2');
      getState().removeFromQueue(item2!.queueId);

      const state = getState();
      expect(state.queue.length).toBe(0);
      expect(state.originalQueue.length).toBe(0);
    });

    it('toggleShuffle ensures currentTrack is first if it exists in queue, handles when not in queue', () => {
      const q = [createTrack('1')];
      getState().playTrack(q[0]!, q);

      usePlayerStore.setState(() => ({
        queue: [],
      }));

      getState().toggleShuffle();
      const state = getState();

      expect(state.isShuffled).toBe(true);
      expect(state.queue.length).toBe(0);
    });

    it('toggleShuffle while shuffled falls back to ordered queue when original snapshot is empty', () => {
      const q = [createTrack('1'), createTrack('2'), createTrack('3')];
      getState().playTrack(q[0]!, q);
      getState().toggleShuffle();
      usePlayerStore.setState({ originalQueue: [] });

      getState().toggleShuffle();
      const state = getState();

      expect(state.isShuffled).toBe(false);
      expect(state.originalQueue).toEqual([]);
      expect(state.queue.map((i) => i.track.id).sort()).toEqual(['2', '3']);
      expect(state.queue.map((i) => i.position)).toEqual([0, 1]);
    });

    it('reordering clears original queue when shuffled', () => {
      const q = [createTrack('1'), createTrack('2'), createTrack('3')];
      getState().playTrack(q[0]!, q);
      getState().toggleShuffle();

      const shuffledQueue = [...getState().queue];
      expect(shuffledQueue.length).toBeGreaterThanOrEqual(2);
      const reversed = [shuffledQueue[1]!, shuffledQueue[0]!];
      getState().reorderQueue(reversed);

      const state = getState();
      expect(state.queue.map((i) => i.track.id)).toEqual(reversed.map((i) => i.track.id));
      expect(state.originalQueue.length).toBe(0);
      expect(state.isShuffled).toBe(false);
    });

    it('reorderQueue while shuffled falls back to original snapshot when new order is empty', () => {
      const q = [createTrack('1'), createTrack('2')];
      getState().playTrack(q[0]!, q);
      getState().toggleShuffle();
      const expectedOrder = getState().originalQueue.map((i) => i.track.id);

      getState().reorderQueue([]);

      const state = getState();
      expect(state.isShuffled).toBe(false);
      expect(state.originalQueue).toEqual([]);
      expect(state.queue.map((i) => i.track.id)).toEqual(expectedOrder);
    });

    it('playNext while shuffled updates original queue correctly', () => {
      const q = [createTrack('1'), createTrack('2')];
      getState().playTrack(q[0]!, q);
      getState().toggleShuffle();

      getState().playNext(createTrack('3'));

      const state = getState();
      expect(state.isShuffled).toBe(true);
      expect(state.queue.map((i) => i.track.id)).toEqual(['3', '2']);
      expect(state.originalQueue.map((i) => i.track.id)).toEqual(['3', '2']);
    });

    it('playNext while shuffled when track is not in original queue (weird state)', () => {
      const q = [createTrack('1')];
      getState().playTrack(q[0]!, q);
      getState().toggleShuffle();

      usePlayerStore.setState((s) => ({
        originalQueue: s.originalQueue.filter((t) => t.track.id !== '1'),
      }));

      getState().playNext(createTrack('2'));

      const state = getState();
      expect(state.isShuffled).toBe(true);
      expect(state.queue.some((i) => i.track.id === '2')).toBe(true);
    });

    it('playNext while shuffled no current track (weird state)', () => {
      getState().setQueue([createTrack('1')]);
      getState().toggleShuffle();
      usePlayerStore.setState({ isShuffled: true, currentTrack: null });

      getState().playNext(createTrack('2'));

      const state = getState();
      expect(state.queue.length).toBe(0);
      expect(state.currentTrack?.id).toBe('2');
    });

    it('playNext while shuffled and currentTrack is not in queue (weird state)', () => {
      const track1 = createTrack('1');
      const track2 = createTrack('2');
      const track3 = createTrack('3');

      getState().playTrack(track1, [track1, track2]);
      getState().toggleShuffle();

      usePlayerStore.setState((state) => ({
        queue: state.queue.filter((t) => t.track.id !== '1'),
      }));

      getState().playNext(track3);

      const state = getState();
      expect(state.isShuffled).toBe(true);
      expect(state.queue.length).toBe(2);
      expect(state.queue.map((i) => i.track.id).sort()).toEqual(['2', '3']);
    });
  });
});
