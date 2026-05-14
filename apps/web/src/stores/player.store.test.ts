import {
  StreamAudioQuality,
  type PlaybackDevice,
  type PlaybackState,
  type PlaybackTrack,
  type ZodTrack,
} from '@repo/contracts';
import { trackBuilder } from '@repo/testing/builders';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePlayerStore } from './player.store';

import { zodTrackToPlaybackTrack } from '../lib/playback-mappers';
import * as queueSync from '../lib/playback-queue-sync';

vi.mock('../lib/playback-queue-sync', () => ({
  emitQueueCommand: vi.fn(),
  isPlaybackSyncConnected: vi.fn(() => false),
}));

vi.mock('../lib/playback-sync', () => ({
  afterLocalPlaybackMutation: vi.fn(),
  afterLocalPlaybackMutationWithClaim: vi.fn(),
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
          { queueId: 'q1', track: t1, position: 1 },
          { queueId: 'q2', track: t2, position: 0 },
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
      expect(state.queue[0]?.queueId).toBe('q2'); // Sorted by position
      expect(state.queue[1]?.queueId).toBe('q1');
    });

    it('sets local device metadata', () => {
      getState().setLocalPlaybackDeviceId('my-device');
      expect(getState().localPlaybackDeviceId).toBe('my-device');

      const device: PlaybackDevice = {
        deviceId: 'd1',
        deviceName: 'D1',
        deviceIcon: 'desktop',
        isActive: true,
        isCurrentDevice: true,
        updatedAt: new Date().toISOString(),
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
      expect(state.queue.length).toBe(1);
      expect(state.queue[0]?.track.id).toBe('track-1');
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
      expect(state.queue.length).toBe(3);
      expect(state.queue[0]?.track.id).toBe('track-1');
      expect(state.queue[1]?.track.id).toBe('track-2');
      expect(state.queue[2]?.track.id).toBe('track-3');
    });

    it('plays a track providing a queue where track is NOT inside (prepends)', () => {
      const track1 = createTrack('track-1');
      const track2 = createTrack('track-2');
      const trackNew = createTrack('track-new');

      getState().playTrack(trackNew, [track1, track2]);

      const state = getState();
      expect(state.currentTrack?.id).toBe('track-new');
      expect(state.queue.length).toBe(3);
      expect(state.queue[0]?.track.id).toBe('track-new');
      expect(state.queue[1]?.track.id).toBe('track-1');
    });

    it('adds current track to history when playing a new track', () => {
      const firstTrack = createTrack('first');
      getState().playTrack(firstTrack);

      const secondTrack = createTrack('second');
      getState().playTrack(secondTrack);

      expect(getState().history.length).toBe(1);
      expect(getState().history[0]?.track.id).toBe('first');
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
      expect(state.queue[1]?.track.id).toBe('2');
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
      expect(getState().queue).toEqual(reversed);
    });
  });

  describe('Play Next', () => {
    it('plays next when queue is empty', () => {
      getState().playNext(createTrack('1'));
      expect(getState().currentTrack?.id).toBe('1');
      expect(getState().queue.length).toBe(1);
      expect(getState().isPlaying).toBe(true);
    });

    it('inserts it right after current track', () => {
      getState().playTrack(createTrack('1'), [createTrack('1'), createTrack('3')]);
      getState().playNext(createTrack('2'));

      const q = getState().queue;
      expect(q.length).toBe(3);
      expect(q[0]?.track.id).toBe('1');
      expect(q[1]?.track.id).toBe('2'); // inserted Next
      expect(q[2]?.track.id).toBe('3');
    });

    it('appends it if current track is not found in queue (weird state)', () => {
      getState().setQueue([createTrack('2')]);
      // manually force state
      usePlayerStore.setState({
        currentTrack: { ...createTrack('1') },
        queue: [{ queueId: 'uid1', track: createTrack('1'), position: 0 }],
      });

      getState().playNext(createTrack('3'));
      const state = getState();
      expect(state.queue[state.queue.length - 1]?.track.id).toBe('3');
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

      // Shuffle ON
      getState().toggleShuffle();
      let state = getState();
      expect(state.isShuffled).toBe(true);
      expect(state.originalQueue.length).toBe(3);
      expect(state.queue.length).toBe(3);

      // The current track must be kept first when turning shuffle on!
      expect(state.queue[0]?.track.id).toBe('1');

      // Shuffle OFF
      const savedOriginalQueue = state.originalQueue;
      getState().toggleShuffle();
      state = getState();
      expect(state.isShuffled).toBe(false);
      expect(state.queue).toEqual(savedOriginalQueue);
      expect(state.originalQueue).toEqual([]);
    });

    it('handles adding to queue while shuffled', () => {
      const q = [createTrack('1')];
      getState().playTrack(q[0]!, q);
      getState().toggleShuffle(); // now shuffled

      getState().addToQueue(createTrack('2'));
      const state = getState();

      expect(state.queue.length).toBe(2);
      expect(state.originalQueue.length).toBe(2);
      expect(state.queue[1]?.track.id).toBe('2');
      expect(state.originalQueue[1]?.track.id).toBe('2');
    });

    it('handles removing from queue while shuffled', () => {
      const q = [createTrack('1'), createTrack('2')];
      getState().playTrack(q[0]!, q);
      getState().toggleShuffle();

      const item2 = getState().queue.find((x) => x.track.id === '2');
      getState().removeFromQueue(item2!.queueId);

      const state = getState();
      expect(state.queue.length).toBe(1);
      expect(state.originalQueue.length).toBe(1);
      expect(state.queue.find((x) => x.track.id === '2')).toBeUndefined();
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
      const q = [createTrack('1'), createTrack('2')];
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
      const q = [createTrack('1'), createTrack('2')];
      getState().playTrack(q[0]!, q);
      getState().toggleShuffle(); // Shuffled

      getState().playNext(createTrack('3'));

      const state = getState();
      // '3' should be in originalQueue right after '1' (currentTrack)
      // and in queue right after '1'
      expect(state.queue[1]?.track.id).toBe('3');
      const origIndex = state.originalQueue.findIndex((t) => t.track.id === '1');
      expect(state.originalQueue[origIndex + 1]?.track.id).toBe('3');
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
      expect(state.originalQueue[state.originalQueue.length - 1]?.track.id).toBe('2');
    });

    it('playNext while shuffled no current track (weird state)', () => {
      getState().setQueue([createTrack('1')]);
      getState().toggleShuffle();
      usePlayerStore.setState({ isShuffled: true, currentTrack: null });

      getState().playNext(createTrack('2'));

      const state = getState();
      expect(state.queue.length).toBe(1);
      expect(state.originalQueue.length).toBe(1);
      expect(state.currentTrack?.id).toBe('2');
    });

    it('playNext while shuffled and currentTrack is not in queue (weird state)', () => {
      const track1 = createTrack('1');
      const track2 = createTrack('2');
      const track3 = createTrack('3');

      getState().playTrack(track1, [track1, track2]);
      getState().toggleShuffle(); // queue: [1, 2], original: [1, 2]

      // Artificially remove current track from queue but keep it as currentTrack
      usePlayerStore.setState((state) => ({
        queue: state.queue.filter((t) => t.track.id !== '1'),
      }));

      getState().playNext(track3); // Should hit line 229

      const state = getState();
      expect(state.queue.length).toBe(2);
      expect(state.queue[1]?.track.id).toBe('3');

      // original queue should also have been updated
      expect(state.originalQueue.length).toBe(3);
      expect(state.originalQueue[2]?.track.id).toBe('3'); // It should be appended to the end of originalQueue because track1 was not in it
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
      expect(getState().history[0]?.track.id).toBe('track-2');
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
      vi.mocked(queueSync.isPlaybackSyncConnected).mockReturnValue(true);
    });

    it('emits state on playTrack', () => {
      const track = createTrack('1');
      getState().playTrack(track);
      expect(queueSync.emitQueueCommand).toHaveBeenCalledWith(
        'command:set-state',
        expect.any(Object),
      );
    });

    it('emits queue on setQueue', () => {
      const tracks = [createTrack('1')];
      getState().setQueue(tracks);
      expect(queueSync.emitQueueCommand).toHaveBeenCalledWith(
        'command:set-queue',
        expect.any(Object),
      );
    });

    it('emits shuffle on toggleShuffle', () => {
      getState().toggleShuffle();
      expect(queueSync.emitQueueCommand).toHaveBeenCalledWith(
        'command:shuffle-queue',
        expect.any(Object),
      );
      expect(queueSync.emitQueueCommand).toHaveBeenCalledWith(
        'command:set-shuffle-state',
        expect.any(Object),
      );
    });

    it('emits state if already shuffled in toggleShuffle', () => {
      usePlayerStore.setState({ isShuffled: true });
      getState().toggleShuffle();
      expect(queueSync.emitQueueCommand).toHaveBeenCalledWith(
        'command:set-shuffle-state',
        expect.any(Object),
      );
    });

    it('emits add-queue-item on addToQueue', () => {
      getState().addToQueue(createTrack('1'));
      expect(queueSync.emitQueueCommand).toHaveBeenCalledWith(
        'command:add-queue-item',
        expect.any(Object),
      );
    });

    it('emits remove-queue-item on removeFromQueue', () => {
      getState().removeFromQueue('uid1');
      expect(queueSync.emitQueueCommand).toHaveBeenCalledWith(
        'command:remove-queue-item',
        expect.any(Object),
      );
    });

    it('emits reorder-queue-items on reorderQueue', () => {
      getState().reorderQueue([]);
      expect(queueSync.emitQueueCommand).toHaveBeenCalledWith(
        'command:reorder-queue-items',
        expect.any(Object),
      );
    });

    it('emits add-queue-item on playNext when active', () => {
      usePlayerStore.setState({
        currentTrack: createTrack('1'),
        queue: [{ queueId: 'q1', track: createTrack('1'), position: 0 }],
      });
      getState().playNext(createTrack('2'));
      expect(queueSync.emitQueueCommand).toHaveBeenCalledWith(
        'command:add-queue-item',
        expect.objectContaining({ position: 1 }),
      );
    });

    it('handles toggleShuffle branch when already shuffled', () => {
      usePlayerStore.setState({ isShuffled: true, playbackVersion: 1 });
      getState().toggleShuffle();
      expect(queueSync.emitQueueCommand).toHaveBeenCalledWith(
        'command:set-shuffle-state',
        expect.objectContaining({ shuffle: false }),
      );
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
      // Line 430: originalQueue should NOT be updated if NOT shuffled and track not found
      expect(getState().originalQueue).toEqual([]);
    });
    it('adds to both reshuffled and original queue if currentTrack is not in queue', () => {
      vi.mocked(queueSync.isPlaybackSyncConnected).mockReturnValue(false);

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
      expect(state.originalQueue).toHaveLength(1);
    });

    it('playNext with shuffle false and currentTrack not in queue', () => {
      vi.mocked(queueSync.isPlaybackSyncConnected).mockReturnValue(false);
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
