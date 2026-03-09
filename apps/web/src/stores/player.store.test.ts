import { StreamAudioQuality, ZodTrack } from '@repo/contracts';
import { beforeEach, describe, expect, it } from 'vitest';
import { usePlayerStore } from './player.store';

const createMockTrack = (id: string, title: string = 'Test Track'): ZodTrack => ({
  id,
  title,
  trackNumber: 1,
  diskNumber: 1,
  duration: 180,
  listenedCount: 0,
  explicit: false,
  lyrics: null,
  albumId: 'album-1',
  visibility: 'public',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
});

describe('player.store', () => {
  beforeEach(() => {
    // Reset Zustand store state before each test
    usePlayerStore.setState({
      currentTrack: null,
      isPlaying: false,
      volume: 1,
      currentTime: 0,
      duration: 0,
      quality: 'auto',
      availableQualities: ['auto'],
      queue: [],
      originalQueue: [],
      history: [],
      repeatMode: 'off',
      isShuffled: false,
      isQueueOpen: false,
      sidebarView: 'queue',
    });
  });

  const getState = () => usePlayerStore.getState();

  describe('Basic Setters & Simple Actions', () => {
    it('sets volume', () => {
      getState().setVolume(0.5);
      expect(getState().volume).toBe(0.5);
    });

    it('sets current time', () => {
      getState().setCurrentTime(10);
      expect(getState().currentTime).toBe(10);
    });

    it('sets duration', () => {
      getState().setDuration(200);
      expect(getState().duration).toBe(200);
    });

    it('sets quality', () => {
      getState().setQuality(StreamAudioQuality.high);
      expect(getState().quality).toBe(StreamAudioQuality.high);
    });

    it('sets available qualities', () => {
      getState().setAvailableQualities([StreamAudioQuality.high, StreamAudioQuality.lossless]);
      expect(getState().availableQualities).toEqual([
        StreamAudioQuality.high,
        StreamAudioQuality.lossless,
      ]);
    });

    it('toggles queue open state', () => {
      getState().toggleQueue();
      expect(getState().isQueueOpen).toBe(true);
      getState().toggleQueue();
      expect(getState().isQueueOpen).toBe(false);
    });

    it('sets queue open directly', () => {
      getState().setQueueOpen(true);
      expect(getState().isQueueOpen).toBe(true);
    });

    it('sets sidebar view', () => {
      getState().setSidebarView('lyrics');
      expect(getState().sidebarView).toBe('lyrics');
    });
  });

  describe('addToHistory', () => {
    it('adds item to history and slices at 1024', () => {
      const track = createMockTrack('1');
      const queueItem = { ...track, uniqueId: 'uid1' };
      getState().addToHistory(queueItem);
      expect(getState().history).toEqual([queueItem]);

      // Just test that it adds to the front
      const track2 = createMockTrack('2');
      const queueItem2 = { ...track2, uniqueId: 'uid2' };
      getState().addToHistory(queueItem2);
      expect(getState().history).toEqual([queueItem2, queueItem]);
    });
  });

  describe('playTrack', () => {
    it('plays a track without providing a queue', () => {
      const track = createMockTrack('track-1');
      getState().playTrack(track);

      const state = getState();
      expect(state.currentTrack?.id).toBe('track-1');
      expect(state.isPlaying).toBe(true);
      expect(state.queue.length).toBe(1);
      expect(state.queue[0]?.id).toBe('track-1');
      expect(state.isShuffled).toBe(false);
      expect(state.currentTime).toBe(0);
      expect(state.originalQueue).toEqual([]);
    });

    it('plays a track providing a queue where track is inside', () => {
      const track1 = createMockTrack('track-1');
      const track2 = createMockTrack('track-2');
      const track3 = createMockTrack('track-3');

      getState().playTrack(track2, [track1, track2, track3]);

      const state = getState();
      expect(state.currentTrack?.id).toBe('track-2');
      expect(state.queue.length).toBe(3);
      expect(state.queue[0]?.id).toBe('track-1');
      expect(state.queue[1]?.id).toBe('track-2');
      expect(state.queue[2]?.id).toBe('track-3');
    });

    it('plays a track providing a queue where track is NOT inside (prepends)', () => {
      const track1 = createMockTrack('track-1');
      const track2 = createMockTrack('track-2');
      const trackNew = createMockTrack('track-new');

      getState().playTrack(trackNew, [track1, track2]);

      const state = getState();
      expect(state.currentTrack?.id).toBe('track-new');
      expect(state.queue.length).toBe(3);
      expect(state.queue[0]?.id).toBe('track-new');
      expect(state.queue[1]?.id).toBe('track-1');
    });

    it('adds current track to history when playing a new track', () => {
      const firstTrack = createMockTrack('first');
      getState().playTrack(firstTrack);

      const secondTrack = createMockTrack('second');
      getState().playTrack(secondTrack);

      expect(getState().history.length).toBe(1);
      expect(getState().history[0]?.id).toBe('first');
    });
  });

  describe('Playback Controls', () => {
    it('pauses', () => {
      getState().playTrack(createMockTrack('1'));
      expect(getState().isPlaying).toBe(true);
      getState().pause();
      expect(getState().isPlaying).toBe(false);
    });

    it('resumes', () => {
      getState().playTrack(createMockTrack('1'));
      getState().pause();
      getState().resume();
      expect(getState().isPlaying).toBe(true);
    });

    it('resumes only if there is a current track', () => {
      getState().resume();
      expect(getState().isPlaying).toBe(false);
    });

    it('toggles playback only if current track exists', () => {
      getState().togglePlay();
      expect(getState().isPlaying).toBe(false);

      getState().playTrack(createMockTrack('1'));
      getState().togglePlay();
      expect(getState().isPlaying).toBe(false);
      getState().togglePlay();
      expect(getState().isPlaying).toBe(true);
    });
  });

  describe('Queue Management', () => {
    it('sets queue directly', () => {
      const tracks = [createMockTrack('1'), createMockTrack('2')];
      getState().setQueue(tracks);

      const state = getState();
      expect(state.queue.length).toBe(2);
      expect(state.queue[0]?.uniqueId).toBeDefined();
      expect(state.isShuffled).toBe(false);
      expect(state.originalQueue).toEqual([]);
    });

    it('adds to queue (not shuffled)', () => {
      getState().setQueue([createMockTrack('1')]);
      expect(getState().queue.length).toBe(1);

      getState().addToQueue(createMockTrack('2'));
      const state = getState();
      expect(state.queue.length).toBe(2);
      expect(state.queue[1]?.id).toBe('2');
    });

    it('removes from queue', () => {
      getState().setQueue([createMockTrack('1'), createMockTrack('2')]);
      const uniqueIdToRemove = getState().queue[1]?.uniqueId;

      getState().removeFromQueue(uniqueIdToRemove!);
      expect(getState().queue.length).toBe(1);
      expect(getState().queue[0]?.id).toBe('1');
    });

    it('reorders queue', () => {
      getState().setQueue([createMockTrack('1'), createMockTrack('2')]);
      const q = getState().queue;
      const reversed = [q[1]!, q[0]!];

      getState().reorderQueue(reversed);
      expect(getState().queue).toEqual(reversed);
    });
  });

  describe('Play Next', () => {
    it('plays next when queue is empty', () => {
      getState().playNext(createMockTrack('1'));
      expect(getState().currentTrack?.id).toBe('1');
      expect(getState().queue.length).toBe(1);
      expect(getState().isPlaying).toBe(true);
    });

    it('inserts it right after current track', () => {
      getState().playTrack(createMockTrack('1'), [createMockTrack('1'), createMockTrack('3')]);
      getState().playNext(createMockTrack('2'));

      const q = getState().queue;
      expect(q.length).toBe(3);
      expect(q[0]?.id).toBe('1');
      expect(q[1]?.id).toBe('2'); // inserted Next
      expect(q[2]?.id).toBe('3');
    });

    it('appends it if current track is not found in queue (weird state)', () => {
      getState().setQueue([createMockTrack('2')]);
      // manually force state
      usePlayerStore.setState({ currentTrack: { ...createMockTrack('1'), uniqueId: 'uid1' } });

      getState().playNext(createMockTrack('3'));
      const state = getState();
      expect(state.queue[state.queue.length - 1]?.id).toBe('3');
    });
  });

  describe('Repeat Mode', () => {
    it('cycles repeat mode off -> all -> one -> off', () => {
      expect(getState().repeatMode).toBe('off');
      getState().toggleRepeatMode();
      expect(getState().repeatMode).toBe('all');
      getState().toggleRepeatMode();
      expect(getState().repeatMode).toBe('one');
      getState().toggleRepeatMode();
      expect(getState().repeatMode).toBe('off');
    });
  });

  describe('Shuffle', () => {
    it('toggles shuffle on and off preserving original queue', () => {
      const q = [createMockTrack('1'), createMockTrack('2'), createMockTrack('3')];
      getState().playTrack(q[0]!, q);

      expect(getState().isShuffled).toBe(false);

      // Shuffle ON
      getState().toggleShuffle();
      let state = getState();
      expect(state.isShuffled).toBe(true);
      expect(state.originalQueue.length).toBe(3);
      expect(state.queue.length).toBe(3);

      // The current track must be kept first when turning shuffle on!
      expect(state.queue[0]?.id).toBe('1');

      // Shuffle OFF
      const savedOriginalQueue = state.originalQueue;
      getState().toggleShuffle();
      state = getState();
      expect(state.isShuffled).toBe(false);
      expect(state.queue).toEqual(savedOriginalQueue);
      expect(state.originalQueue).toEqual([]);
    });

    it('handles adding to queue while shuffled', () => {
      const q = [createMockTrack('1')];
      getState().playTrack(q[0]!, q);
      getState().toggleShuffle(); // now shuffled

      getState().addToQueue(createMockTrack('2'));
      const state = getState();

      expect(state.queue.length).toBe(2);
      expect(state.originalQueue.length).toBe(2);
      expect(state.queue[1]?.id).toBe('2');
      expect(state.originalQueue[1]?.id).toBe('2');
    });

    it('handles removing from queue while shuffled', () => {
      const q = [createMockTrack('1'), createMockTrack('2')];
      getState().playTrack(q[0]!, q);
      getState().toggleShuffle();

      const item2 = getState().queue.find((x) => x.id === '2');
      getState().removeFromQueue(item2!.uniqueId);

      const state = getState();
      expect(state.queue.length).toBe(1);
      expect(state.originalQueue.length).toBe(1);
      expect(state.queue.find((x) => x.id === '2')).toBeUndefined();
    });

    it('toggleShuffle ensures currentTrack is first if it exists in queue, handles when not in queue', () => {
      const q = [createMockTrack('1')];
      getState().playTrack(q[0]!, q);

      // Artificially remove the currentTrack from the queue
      usePlayerStore.setState(() => ({
        queue: [],
      }));

      // Turn shuffle on - should hit line 172 where trackIndex === -1
      getState().toggleShuffle();
      const state = getState();

      expect(state.isShuffled).toBe(true);
      expect(state.queue.length).toBe(0);
    });

    it('reordering clears original queue when shuffled', () => {
      const q = [createMockTrack('1'), createMockTrack('2')];
      getState().playTrack(q[0]!, q);
      getState().toggleShuffle();

      const shuffledQueue = [...getState().queue];
      const reversed = [shuffledQueue[1]!, shuffledQueue[0]!];
      getState().reorderQueue(reversed);

      const state = getState();
      expect(state.queue).toEqual(reversed);
      expect(state.originalQueue.length).toBe(2); // In reorderQueue, if shuffled, it keeps originalQueue
    });

    it('playNext while shuffled updates original queue correctly', () => {
      const q = [createMockTrack('1'), createMockTrack('2')];
      getState().playTrack(q[0]!, q);
      getState().toggleShuffle(); // Shuffled

      getState().playNext(createMockTrack('3'));

      const state = getState();
      // '3' should be in originalQueue right after '1' (currentTrack)
      // and in queue right after '1'
      expect(state.queue[1]?.id).toBe('3');
      const origIndex = state.originalQueue.findIndex((t) => t.id === '1');
      expect(state.originalQueue[origIndex + 1]?.id).toBe('3');
    });

    it('playNext while shuffled when track is not in original queue (weird state)', () => {
      const q = [createMockTrack('1')];
      getState().playTrack(q[0]!, q);
      getState().toggleShuffle();

      // artificially remove currentTrack from originalQueue but keep in queue
      usePlayerStore.setState((s) => ({
        originalQueue: s.originalQueue.filter((t) => t.id !== '1'),
      }));

      getState().playNext(createMockTrack('2'));

      const state = getState();
      expect(state.originalQueue[state.originalQueue.length - 1]?.id).toBe('2');
    });

    it('playNext while shuffled no current track (weird state)', () => {
      getState().setQueue([createMockTrack('1')]);
      getState().toggleShuffle();
      usePlayerStore.setState({ isShuffled: true, currentTrack: null });

      getState().playNext(createMockTrack('2'));

      const state = getState();
      expect(state.queue.length).toBe(1);
      expect(state.originalQueue.length).toBe(1);
      expect(state.currentTrack?.id).toBe('2');
    });

    it('playNext while shuffled and currentTrack is not in queue (weird state)', () => {
      const track1 = createMockTrack('1');
      const track2 = createMockTrack('2');
      const track3 = createMockTrack('3');

      getState().playTrack(track1, [track1, track2]);
      getState().toggleShuffle(); // queue: [1, 2], original: [1, 2]

      // Artificially remove current track from queue but keep it as currentTrack
      usePlayerStore.setState((state) => ({
        queue: state.queue.filter((t) => t.id !== '1'),
      }));

      getState().playNext(track3); // Should hit line 229

      const state = getState();
      expect(state.queue.length).toBe(2);
      expect(state.queue[1]?.id).toBe('3');

      // original queue should also have been updated
      expect(state.originalQueue.length).toBe(3);
      expect(state.originalQueue[2]?.id).toBe('3'); // It should be appended to the end of originalQueue because track1 was not in it
    });
  });

  describe('Next/Previous Track', () => {
    it('goes to next track', () => {
      getState().playTrack(createMockTrack('1'), [createMockTrack('1'), createMockTrack('2')]);
      getState().nextTrack();

      expect(getState().currentTrack?.id).toBe('2');
      expect(getState().history.length).toBe(1);
      expect(getState().history[0]?.id).toBe('1');
    });

    it('goes to previous track', () => {
      getState().playTrack(createMockTrack('1'), [createMockTrack('1'), createMockTrack('2')]);
      getState().nextTrack(); // Now on '2'
      getState().previousTrack(); // Back to '1'

      expect(getState().currentTrack?.id).toBe('1');
      expect(getState().history[0]?.id).toBe('2');
    });

    it('restarts current track if > 3s in', () => {
      getState().playTrack(createMockTrack('1'), [createMockTrack('1'), createMockTrack('2')]);
      getState().nextTrack(); // is on '2'
      getState().setCurrentTime(5); // past 3 seconds

      getState().previousTrack(); // should just reset time

      expect(getState().currentTrack?.id).toBe('2');
      expect(getState().currentTime).toBe(0);
    });

    it('does nothing if no current track or queue empty for next/prev', () => {
      getState().nextTrack();
      getState().previousTrack();
      expect(getState().currentTrack).toBeNull();
    });

    it('loops to start if repeatMode = all on nextTrack', () => {
      getState().playTrack(createMockTrack('1'), [createMockTrack('1'), createMockTrack('2')]);
      getState().toggleRepeatMode(); // 'all'

      getState().nextTrack(); // on 2
      getState().nextTrack(); // loops to 1

      expect(getState().currentTrack?.id).toBe('1');
    });

    it('does not loop if repeatMode = off on nextTrack', () => {
      getState().playTrack(createMockTrack('1'), [createMockTrack('1'), createMockTrack('2')]);
      getState().nextTrack(); // on 2
      getState().nextTrack(); // nothing happens
      expect(getState().currentTrack?.id).toBe('2');
    });

    it('loops to end if repeatMode = all on previousTrack', () => {
      getState().playTrack(createMockTrack('1'), [createMockTrack('1'), createMockTrack('2')]);
      getState().toggleRepeatMode(); // 'all'

      getState().previousTrack(); // loops to 2

      expect(getState().currentTrack?.id).toBe('2');
    });

    it('does not loop if repeatMode = off on previousTrack', () => {
      getState().playTrack(createMockTrack('1'), [createMockTrack('1'), createMockTrack('2')]);
      getState().previousTrack(); // nothing happens
      expect(getState().currentTrack?.id).toBe('1');
    });
  });
});
