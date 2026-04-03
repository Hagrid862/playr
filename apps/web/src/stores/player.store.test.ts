import { testQueueItem } from '@/test-utils/queue-test-fixtures';
import {
    StreamAudioQuality,
    type ListPlaybackDeviceEntry,
    type PlaybackState,
    type PlaybackTrack,
    type ZodTrack,
} from '@repo/contracts';
import { trackBuilder } from '@repo/testing/builders';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePlayerStore } from './player.store';

import { zodTrackToPlaybackTrack } from '../lib/playback-mappers';
import * as playbackSync from '../lib/playback-sync';

vi.mock('../lib/playback-sync', () => ({
  afterLocalPlaybackMutation: vi.fn(),
  afterLocalPlaybackMutationWithClaim: vi.fn(),
  syncPlayingStateToServer: vi.fn(),
  isPlaybackSyncConnected: vi.fn(() => false),
}));

const getState = () => usePlayerStore.getState();

const createTrack = (id: string, title = 'Test Track'): PlaybackTrack =>
  zodTrackToPlaybackTrack(
    trackBuilder({ id, title, visibility: 'public', albumId: 'test-album' }) as ZodTrack,
  );

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

  describe('Server State Sync', () => {
    it('applies playback state from server', () => {
      const t1 = createTrack('t1', 'Title');
      const t2 = createTrack('t2');
      const stateFromServer = {
        version: 10,
        devices: [],
        favorited: 'favorited' as const,
        inLibrary: true,
        activeDeviceId: 'device-1',
        trackData: t1,
        isPlaying: true,
        currentTime: 50,
        volume: 0.8,
        repeatMode: 'all' as const,
        shuffle: true,
        queue: [
          testQueueItem({
            queueId: '01900000-0000-7000-8000-0000000000e1',
            track: t1,
            position: 1,
            originalPosition: 1,
          }),
          testQueueItem({
            queueId: '01900000-0000-7000-8000-0000000000e2',
            track: t2,
            position: 0,
            originalPosition: 0,
          }),
        ],
      } as unknown as PlaybackState;

      getState().applyPlaybackStateFromServer(stateFromServer);

      const state = getState();
      expect(state.playbackVersion).toBe(10);
      expect(state.playbackFavorited).toBe('favorited');
      expect(state.isPlaying).toBe(true);
      expect(state.currentTime).toBe(50);
      expect(state.volume).toBe(0.8);
      expect(state.repeatMode).toBe('all');
      expect(state.isShuffled).toBe(true);
      expect(state.queue[0]?.queueId).toBe('01900000-0000-7000-8000-0000000000e2');
      expect(state.queue[1]?.queueId).toBe('01900000-0000-7000-8000-0000000000e1');
    });

    it('applies history from server', () => {
      const t1 = createTrack('t1');
      const t2 = createTrack('t2');
      const histItem = testQueueItem({
        queueId: '01900000-0000-7000-8000-0000000000h1',
        track: t2,
        position: 0,
        originalPosition: 0,
        type: 'playingNext',
      });
      const stateFromServer = {
        version: 3,
        userId: 'u1',
        devices: [],
        favorited: 'not-set' as const,
        inLibrary: false,
        activeDeviceId: null,
        trackData: t1,
        isPlaying: true,
        currentTime: 0,
        volume: 1,
        repeatMode: 'off' as const,
        shuffle: false,
        updatedAt: new Date().toISOString(),
        queue: [],
        history: [histItem],
      } as unknown as PlaybackState;

      getState().applyPlaybackStateFromServer(stateFromServer);

      expect(getState().history).toHaveLength(1);
      expect(getState().history[0]?.track.id).toBe('t2');
    });

    it('preserves local currentTime for active audio owner when server sends different time while playing', () => {
      const t1 = createTrack('t1', 'Title');
      const t2 = createTrack('t2');
      const t3 = createTrack('t3');

      usePlayerStore.setState({
        localPlaybackDeviceId: 'this-device',
        playbackVersion: 5,
        currentTime: 42,
        currentTrack: t1,
        isPlaying: true,
      });

      const stateFromServer = {
        version: 6,
        userId: 'u1',
        devices: [],
        favorited: 'not-set' as const,
        inLibrary: false,
        activeDeviceId: 'this-device',
        trackData: t1,
        isPlaying: true,
        currentTime: 1,
        volume: 1,
        repeatMode: 'off' as const,
        shuffle: false,
        updatedAt: new Date().toISOString(),
        queue: [
          testQueueItem({
            queueId: '01900000-0000-7000-8000-0000000000f1',
            track: t2,
            position: 0,
            originalPosition: 0,
          }),
          testQueueItem({
            queueId: '01900000-0000-7000-8000-0000000000f2',
            track: t3,
            position: 1,
            originalPosition: 1,
          }),
        ],
      } as unknown as PlaybackState;

      getState().applyPlaybackStateFromServer(stateFromServer);

      expect(getState().currentTime).toBe(42);
      expect(getState().playbackVersion).toBe(6);
      expect(getState().queue).toHaveLength(2);
    });

    it('sets local device metadata', () => {
      getState().setLocalPlaybackDeviceId('my-device');
      expect(getState().localPlaybackDeviceId).toBe('my-device');

      const device: ListPlaybackDeviceEntry = {
        id: 'd1',
        name: 'D1',
        icon: 'desktop',
        isActive: true,
        isCurrentDevice: true,
      };
      getState().setPlaybackDevices([device]);
      expect(getState().playbackDevices).toEqual([device]);
    });
  });

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

  /*
  describe('addToHistory', () => {
    it('adds item to history and slices at 1024', () => {
      const track = createTrack('1');
      const queueItem = { queueId: 'uid1', track, position: 0 };
      getState().addToHistory(queueItem);
      expect(getState().history).toEqual([queueItem]);

      // Just test that it adds to the front
      const track2 = createTrack('2');
      const queueItem2 = { queueId: 'uid2', track: track2, position: 1 };
      getState().addToHistory(queueItem2);
      expect(getState().history).toEqual([queueItem2, queueItem]);
    });
  });
*/

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

  describe('Playback Controls', () => {
    it('pauses', () => {
      getState().playTrack(createTrack('1'));
      expect(getState().isPlaying).toBe(true);
      getState().pause();
      expect(getState().isPlaying).toBe(false);
    });

    it('resumes', () => {
      getState().playTrack(createTrack('1'));
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

      getState().playTrack(createTrack('1'));
      getState().togglePlay();
      expect(getState().isPlaying).toBe(false);
      getState().togglePlay();
      expect(getState().isPlaying).toBe(true);
    });
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
      expect(state.queue.map((i) => i.track.id).sort()).toEqual(['1', '2']);
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
      // manually force state
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
      const q = [createTrack('1'), createTrack('2'), createTrack('3')];
      getState().playTrack(q[0]!, q);

      expect(getState().isShuffled).toBe(false);
      const preShuffleOrder = getState().queue.map((i) => i.track.id);

      // Shuffle ON
      getState().toggleShuffle();
      let state = getState();
      expect(state.isShuffled).toBe(true);
      expect(state.originalQueue.length).toBe(2);
      expect(state.queue.length).toBe(2);

      // Shuffle OFF
      getState().toggleShuffle();
      state = getState();
      expect(state.isShuffled).toBe(false);
      expect(state.queue.map((i) => i.track.id)).toEqual(preShuffleOrder);
      expect(state.originalQueue).toEqual([]);
    });

    it('handles adding to queue while shuffled', () => {
      const q = [createTrack('1'), createTrack('2')];
      getState().playTrack(q[0]!, q);
      getState().toggleShuffle(); // now shuffled

      getState().addToQueue(createTrack('3'));
      const state = getState();

      expect(state.queue.length).toBe(2);
      expect(state.isShuffled).toBe(false);
      expect(state.queue.map((i) => i.track.id).sort()).toEqual(['2', '3']);
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

    it('playNext while shuffled updates original queue correctly', () => {
      const q = [createTrack('1'), createTrack('2')];
      getState().playTrack(q[0]!, q);
      getState().toggleShuffle(); // Shuffled

      getState().playNext(createTrack('3'));

      const state = getState();
      expect(state.isShuffled).toBe(false);
      expect(state.queue.map((i) => i.track.id)).toEqual(['3', '2']);
    });

    it('playNext while shuffled when track is not in original queue (weird state)', () => {
      const q = [createTrack('1')];
      getState().playTrack(q[0]!, q);
      getState().toggleShuffle();

      // artificially remove currentTrack from originalQueue but keep in queue
      usePlayerStore.setState((s) => ({
        originalQueue: s.originalQueue.filter((t) => t.track.id !== '1'),
      }));

      getState().playNext(createTrack('2'));

      const state = getState();
      expect(state.isShuffled).toBe(false);
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
      getState().toggleShuffle(); // next-only queue: [2]

      // Artificially remove current track from queue but keep it as currentTrack
      usePlayerStore.setState((state) => ({
        queue: state.queue.filter((t) => t.track.id !== '1'),
      }));

      getState().playNext(track3);

      const state = getState();
      expect(state.isShuffled).toBe(false);
      expect(state.queue.length).toBe(2);
      expect(state.queue.map((i) => i.track.id).sort()).toEqual(['2', '3']);
    });
  });

  describe('Next/Previous Track', () => {
    it('goes to next track', () => {
      const track1 = createTrack('track-1');
      const track2 = createTrack('track-2');
      getState().playTrack(track1, [track1, track2]);
      getState().nextTrack();

      const state = getState();
      expect(state.currentTrack?.id).toBe('track-2');
      expect(state.history.length).toBe(1);
      expect(state.history[0]?.track.id).toBe('track-1');
    });

    it('goes to previous track', () => {
      const track1 = createTrack('track-1');
      const track2 = createTrack('track-2');
      getState().playTrack(track1, [track1, track2]);
      getState().nextTrack(); // Now on '2'
      getState().previousTrack(); // Back to '1'

      expect(getState().currentTrack?.id).toBe('track-1');
      expect(getState().queue.some((q) => q.track.id === 'track-2')).toBe(true);
    });

    it('restarts current track if > 3s in', () => {
      getState().playTrack(createTrack('1'), [createTrack('1'), createTrack('2')]);
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
      getState().playTrack(createTrack('1'), [createTrack('1'), createTrack('2')]);
      getState().toggleRepeatMode(); // 'all'

      getState().nextTrack(); // on 2
      getState().nextTrack(); // loops to 1

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
      getState().toggleRepeatMode(); // 'all'

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
      getState().nextTrack(); // on 2
      getState().nextTrack(); // nothing happens
      expect(getState().currentTrack?.id).toBe('2');
    });

    it('loops to end if repeatMode = all on previousTrack', () => {
      getState().playTrack(createTrack('1'), [createTrack('1'), createTrack('2')]);
      getState().toggleRepeatMode(); // 'all'

      getState().previousTrack(); // loops to 2

      expect(getState().currentTrack?.id).toBe('2');
    });

    it('does not loop if repeatMode = off on previousTrack', () => {
      getState().playTrack(createTrack('1'), [createTrack('1'), createTrack('2')]);
      getState().previousTrack(); // nothing happens
      expect(getState().currentTrack?.id).toBe('1');
    });
  });

  describe('Synced Playback Actions', () => {
    beforeEach(() => {
      vi.mocked(playbackSync.isPlaybackSyncConnected).mockReturnValue(true);
    });

    it('pushes state on playTrack via set-state sync', () => {
      const track = createTrack('1');
      getState().playTrack(track);
      expect(playbackSync.afterLocalPlaybackMutationWithClaim).toHaveBeenCalled();
    });

    it('pushes state on setQueue', () => {
      const tracks = [createTrack('1')];
      getState().setQueue(tracks);
      expect(playbackSync.afterLocalPlaybackMutation).toHaveBeenCalled();
    });

    it('pushes state when enabling shuffle', () => {
      getState().toggleShuffle();
      expect(playbackSync.afterLocalPlaybackMutation).toHaveBeenCalled();
    });

    it('pushes state when disabling shuffle', () => {
      usePlayerStore.setState({
        isShuffled: true,
        originalQueue: [testQueueItem({ track: createTrack('a') })],
      });
      getState().toggleShuffle();
      expect(playbackSync.afterLocalPlaybackMutation).toHaveBeenCalled();
    });

    it('pushes state on addToQueue', () => {
      getState().addToQueue(createTrack('1'));
      expect(playbackSync.afterLocalPlaybackMutation).toHaveBeenCalled();
    });

    it('pushes state on removeFromQueue', () => {
      const qid = '01900000-0000-7000-8000-0000000000f1';
      usePlayerStore.setState({
        queue: [testQueueItem({ queueId: qid, track: createTrack('1') })],
      });
      getState().removeFromQueue(qid);
      expect(playbackSync.afterLocalPlaybackMutation).toHaveBeenCalled();
    });

    it('pushes state on reorderQueue', () => {
      getState().reorderQueue([]);
      expect(playbackSync.afterLocalPlaybackMutation).toHaveBeenCalled();
    });

    it('pushes state on playNext when sync connected', () => {
      usePlayerStore.setState({
        currentTrack: createTrack('1'),
        queue: [
          testQueueItem({
            queueId: '01900000-0000-7000-8000-0000000000c2',
            track: createTrack('1'),
          }),
        ],
      });
      getState().playNext(createTrack('2'));
      expect(playbackSync.afterLocalPlaybackMutation).toHaveBeenCalled();
    });

    it('pushes state when turning shuffle off with playbackVersion set', () => {
      usePlayerStore.setState({
        isShuffled: true,
        playbackVersion: 1,
        originalQueue: [testQueueItem({ track: createTrack('x') })],
      });
      getState().toggleShuffle();
      expect(playbackSync.afterLocalPlaybackMutation).toHaveBeenCalled();
    });

    it('syncs play/pause via syncPlayingStateToServer when connected', () => {
      vi.mocked(playbackSync.isPlaybackSyncConnected).mockReturnValue(true);
      usePlayerStore.setState({
        activeDeviceId: null,
        localPlaybackDeviceId: 'device-1',
      });
      getState().playTrack(createTrack('1'));
      vi.mocked(playbackSync.syncPlayingStateToServer).mockClear();
      getState().pause();
      expect(playbackSync.syncPlayingStateToServer).toHaveBeenCalledWith(false);
      getState().resume();
      expect(playbackSync.syncPlayingStateToServer).toHaveBeenCalledWith(true);
      getState().togglePlay();
      expect(playbackSync.syncPlayingStateToServer).toHaveBeenCalledWith(false);
    });

    it('handles null artists in applyPlaybackStateFromServer branch', () => {
      getState().applyPlaybackStateFromServer({
        trackData: {
          id: '1',
          title: 'T',
          artists: null,
          duration: 100,
        },
        version: 1,
        queue: [],
      } as unknown as PlaybackState);
      expect(getState().currentTrack?.artists).toEqual([]);
    });

    it('playNext appends to originalQueue when NOT shuffled and track not in queue', () => {
      usePlayerStore.setState({ isShuffled: false, originalQueue: [] });
      getState().playNext(createTrack('3'));
      expect(getState().originalQueue).toEqual([]);
    });

    it('playNext while shuffled unshuffles then prepends item (originalQueue cleared)', () => {
      vi.mocked(playbackSync.isPlaybackSyncConnected).mockReturnValue(false);

      const { playNext } = usePlayerStore.getState();
      const track1: PlaybackTrack = {
        id: 't1',
        title: 'T1',
        trackId: 'tr1',
        artists: ['A1'],
        albumName: 'AL1',
        albumId: 'aid1',
        albumArt: null,
        duration: 100,
        explicit: false,
      };
      const track2: PlaybackTrack = {
        id: 't2',
        title: 'T2',
        trackId: 'tr2',
        artists: ['A2'],
        albumName: 'AL2',
        albumId: 'aid2',
        albumArt: null,
        duration: 100,
        explicit: false,
      };

      usePlayerStore.setState({
        currentTrack: track1,
        queue: [],
        originalQueue: [],
        isShuffled: true,
      });

      playNext(track2);

      const state = usePlayerStore.getState();
      expect(state.queue).toHaveLength(1);
      expect(state.isShuffled).toBe(false);
      expect(state.originalQueue).toHaveLength(0);
    });

    it('playNext with shuffle false and currentTrack not in queue', () => {
      vi.mocked(playbackSync.isPlaybackSyncConnected).mockReturnValue(false);
      const track1: PlaybackTrack = {
        id: 't1',
        title: 'T1',
        trackId: 'tr1',
        artists: ['A1'],
        albumName: 'AL1',
        albumId: 'aid1',
        albumArt: null,
        duration: 100,
        explicit: false,
      };
      const track2: PlaybackTrack = {
        id: 't2',
        title: 'T2',
        trackId: 'tr2',
        artists: ['A2'],
        albumName: 'AL2',
        albumId: 'aid2',
        albumArt: null,
        duration: 100,
        explicit: false,
      };

      usePlayerStore.setState({
        currentTrack: track1,
        queue: [],
        originalQueue: [],
        isShuffled: false,
      });

      getState().playNext(track2);

      expect(getState().queue).toHaveLength(1);
      expect(getState().originalQueue).toHaveLength(0);
    });
  });
});
