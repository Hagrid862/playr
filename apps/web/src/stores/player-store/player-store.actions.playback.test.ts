import { testQueueItem } from '@/test-utils/queue-test-fixtures';
import { PLAYBACK_HISTORY_MAX_LENGTH } from '@repo/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/playback-sync', () => ({
  afterLocalPlaybackMutation: vi.fn(),
  afterLocalPlaybackMutationWithClaim: vi.fn(),
  syncPlayingStateToServer: vi.fn(),
  isPlaybackSyncConnected: vi.fn(() => false),
}));

import { createTrack, getState, resetPlayerStore } from './player-store.test-helpers';
import { usePlayerStore } from './player.store';

describe('player-store.actions.playback', () => {
  beforeEach(() => {
    resetPlayerStore();
  });

  describe('playTrack', () => {
    it('plays a track without providing a queue', () => {
      const track = createTrack('track-1');
      getState().playTrack(track);

      const state = getState();
      expect(state.currentTrack?.id).toBe('track-1');
      expect(state.isPlaying).toBe(true);
      expect(state.queue.length).toBe(0);
      expect(state.isShuffled).toBe(false);
      expect(state.currentTime).toBe(0);
      expect(state.originalQueue).toEqual([]);
    });

    it('plays a track providing a queue where track is inside', () => {
      const track1 = createTrack('track-1');
      const track2 = createTrack('track-2');
      const track3 = createTrack('track-3');

      getState().playTrack(track2, [track1, track2, track3]);

      const state = getState();
      expect(state.currentTrack?.id).toBe('track-2');
      expect(state.queue.length).toBe(2);
      expect(state.queue[0]?.track.id).toBe('track-1');
      expect(state.queue[1]?.track.id).toBe('track-3');
    });

    it('plays a track providing a queue where track is NOT inside (prepends)', () => {
      const track1 = createTrack('track-1');
      const track2 = createTrack('track-2');
      const trackNew = createTrack('track-new');

      getState().playTrack(trackNew, [track1, track2]);

      const state = getState();
      expect(state.currentTrack?.id).toBe('track-new');
      expect(state.queue.length).toBe(2);
      expect(state.queue[0]?.track.id).toBe('track-1');
      expect(state.queue[1]?.track.id).toBe('track-2');
    });

    it('adds current track to history when playing a new track', () => {
      const firstTrack = createTrack('first');
      getState().playTrack(firstTrack);

      const secondTrack = createTrack('second');
      getState().playTrack(secondTrack);

      expect(getState().history.length).toBe(1);
      expect(getState().history[0]?.track.id).toBe('first');
    });

    it('clears previous queue when playing album with single-track list', () => {
      const t = createTrack('solo');
      const existing = [
        testQueueItem({
          queueId: '01900000-0000-7000-8000-0000000000a1',
          track: createTrack('q1'),
        }),
        testQueueItem({
          queueId: '01900000-0000-7000-8000-0000000000a2',
          track: createTrack('q2'),
        }),
      ];
      usePlayerStore.setState({ queue: existing });
      getState().playTrack(t, [t]);
      expect(getState().queue.length).toBe(0);
      expect(getState().currentTrack?.id).toBe('solo');
    });

    it('clears previous queue when playTrack receives empty album array', () => {
      const t = createTrack('x');
      const existing = [
        testQueueItem({
          queueId: '01900000-0000-7000-8000-0000000000b1',
          track: createTrack('q1'),
        }),
      ];
      usePlayerStore.setState({ queue: existing });
      getState().playTrack(t, []);
      expect(getState().queue.length).toBe(0);
      expect(getState().currentTrack?.id).toBe('x');
    });

    it('preserves queue when playTrack called without album remainder', () => {
      const t = createTrack('new');
      const q1 = createTrack('q1');
      const existing = [
        testQueueItem({
          queueId: '01900000-0000-7000-8000-0000000000c1',
          track: q1,
        }),
      ];
      usePlayerStore.setState({ queue: existing });
      getState().playTrack(t);
      expect(getState().queue.length).toBe(1);
      expect(getState().queue[0]?.track.id).toBe('q1');
      expect(getState().currentTrack?.id).toBe('new');
    });

    it('clears history when starting album context', () => {
      usePlayerStore.setState({
        history: [
          testQueueItem({
            queueId: '01900000-0000-7000-8000-0000000000d1',
            track: createTrack('h1'),
          }),
        ],
      });
      getState().playTrack(createTrack('a1'), [createTrack('a1'), createTrack('a2')]);
      expect(getState().history.length).toBe(0);
    });
  });

  describe('playQueueItem', () => {
    it('no-ops when queueId is not in the ordered queue', () => {
      getState().setQueue([createTrack('1')]);
      const beforeId = getState().currentTrack?.id ?? null;
      const beforeLen = getState().queue.length;
      getState().playQueueItem('00000000-0000-0000-0000-000000000000');
      expect(getState().currentTrack?.id ?? null).toBe(beforeId);
      expect(getState().queue).toHaveLength(beforeLen);
    });

    it('records current track in history when jumping via queue', () => {
      const t1 = createTrack('1');
      const t2 = createTrack('2');
      const t3 = createTrack('3');
      getState().playTrack(t1, [t1, t2, t3]);
      const id3 = getState().queue.find((x) => x.track.id === '3')!.queueId;
      getState().playQueueItem(id3);
      const histIds = getState().history.map((h) => h.track.id);
      expect(histIds).toContain('1');
    });

    it('does not record a current track when none is playing', () => {
      getState().setQueue([createTrack('1'), createTrack('2')]);
      const id2 = getState().queue.find((x) => x.track.id === '2')!.queueId;
      getState().playQueueItem(id2);
      expect(getState().currentTrack?.id).toBe('2');
      expect(getState().history.map((h) => h.track.id)).toEqual(['1']);
    });
  });

  describe('addToHistory', () => {
    it(`caps history at ${PLAYBACK_HISTORY_MAX_LENGTH} items`, () => {
      const history = Array.from({ length: PLAYBACK_HISTORY_MAX_LENGTH }, (_, i) =>
        testQueueItem({ track: createTrack(`h${i}`) }),
      );
      usePlayerStore.setState({ history });
      getState().addToHistory(testQueueItem({ track: createTrack('newest') }));
      expect(getState().history).toHaveLength(PLAYBACK_HISTORY_MAX_LENGTH);
      expect(getState().history[0]?.track.id).toBe('newest');
    });
  });

  describe('Next/Previous Track', () => {
    it('goes to next track and reindexes remaining queue items', () => {
      const track1 = createTrack('track-1');
      const track2 = createTrack('track-2');
      const track3 = createTrack('track-3');
      getState().playTrack(track1, [track1, track2, track3]);
      getState().nextTrack();

      const state = getState();
      expect(state.currentTrack?.id).toBe('track-2');
      expect(state.history.length).toBe(1);
      expect(state.history[0]?.track.id).toBe('track-1');
      expect(state.queue.map((q) => q.track.id)).toEqual(['track-3']);
      expect(state.queue.map((q) => q.position)).toEqual([0]);
    });

    it('goes to previous track', () => {
      const track1 = createTrack('track-1');
      const track2 = createTrack('track-2');
      getState().playTrack(track1, [track1, track2]);
      getState().nextTrack();
      getState().previousTrack();

      expect(getState().currentTrack?.id).toBe('track-1');
      expect(getState().queue.some((q) => q.track.id === 'track-2')).toBe(true);
    });

    it('restarts current track if > 3s in', () => {
      getState().playTrack(createTrack('1'), [createTrack('1'), createTrack('2')]);
      getState().nextTrack();
      getState().setCurrentTime(5);

      getState().previousTrack();

      expect(getState().currentTrack?.id).toBe('2');
      expect(getState().currentTime).toBe(0);
    });

    it('does nothing if no current track or queue empty for next/prev', () => {
      getState().nextTrack();
      getState().previousTrack();
      expect(getState().currentTrack).toBeNull();
    });

    it('loops to start if repeatMode = all on nextTrack', () => {
      getState().playTrack(createTrack('1'), [createTrack('1'), createTrack('2')]);
      getState().toggleRepeatMode();

      getState().nextTrack();
      getState().nextTrack();

      expect(getState().currentTrack?.id).toBe('1');
    });

    it('repeat all keeps album queue size stable across loops when old history existed', () => {
      usePlayerStore.setState({
        history: [
          testQueueItem({
            queueId: '01900000-0000-7000-8000-0000000000e1',
            track: createTrack('old'),
          }),
          testQueueItem({
            queueId: '01900000-0000-7000-8000-0000000000e2',
            track: createTrack('older'),
          }),
        ],
      });
      const t1 = createTrack('1');
      const t2 = createTrack('2');
      const t3 = createTrack('3');
      getState().playTrack(t1, [t1, t2, t3]);
      getState().toggleRepeatMode();

      const advanceOneLoop = () => {
        getState().nextTrack();
        getState().nextTrack();
        getState().nextTrack();
      };

      advanceOneLoop();
      expect(getState().currentTrack?.id).toBe('1');
      expect(getState().queue.map((q) => q.track.id)).toEqual(['2', '3']);

      advanceOneLoop();
      expect(getState().currentTrack?.id).toBe('1');
      expect(getState().queue.map((q) => q.track.id)).toEqual(['2', '3']);
    });

    it('does not loop if repeatMode = off on nextTrack', () => {
      getState().playTrack(createTrack('1'), [createTrack('1'), createTrack('2')]);
      getState().nextTrack();
      getState().nextTrack();
      expect(getState().currentTrack?.id).toBe('2');
    });

    it('loops to end if repeatMode = all on previousTrack', () => {
      getState().playTrack(createTrack('1'), [createTrack('1'), createTrack('2')]);
      getState().toggleRepeatMode();

      getState().previousTrack();

      expect(getState().currentTrack?.id).toBe('2');
    });

    it('repeat all on previousTrack jumps to last in queue and reindexes multiple remainder items', () => {
      const t1 = createTrack('1');
      const t2 = createTrack('2');
      const t3 = createTrack('3');
      const t4 = createTrack('4');
      getState().playTrack(t1, [t1, t2, t3, t4]);
      getState().toggleRepeatMode();

      getState().previousTrack();

      expect(getState().currentTrack?.id).toBe('4');
      expect(getState().history.some((h) => h.track.id === '1')).toBe(true);
      expect(getState().queue.map((q) => q.track.id)).toEqual(['2', '3']);
      expect(getState().queue.map((q) => q.position)).toEqual([0, 1]);
    });

    it('nextTrack no-ops when repeat all, queue empty, and history empty', () => {
      getState().playTrack(createTrack('only'));
      getState().toggleRepeatMode();
      getState().nextTrack();
      expect(getState().currentTrack?.id).toBe('only');
      expect(getState().isPlaying).toBe(true);
    });

    it('does not loop if repeatMode = off on previousTrack', () => {
      getState().playTrack(createTrack('1'), [createTrack('1'), createTrack('2')]);
      getState().previousTrack();
      expect(getState().currentTrack?.id).toBe('1');
    });

    it('previousTrack no-ops when repeat all but queue has no further tracks', () => {
      getState().playTrack(createTrack('solo'));
      getState().toggleRepeatMode();
      getState().previousTrack();
      expect(getState().currentTrack?.id).toBe('solo');
    });
  });
});
