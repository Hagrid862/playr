import { testQueueItem } from '@/test-utils/queue-test-fixtures';
import type { PlaybackState, PlaybackTrack } from '@repo/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/playback/sync/playback-sync', () => ({
  afterLocalPlaybackMutation: vi.fn(),
  afterLocalPlaybackMutationWithClaim: vi.fn(),
  syncPlayingStateToServer: vi.fn(),
  isPlaybackSyncConnected: vi.fn(() => false),
}));

import * as playbackSync from '@/lib/playback/sync/playback-sync';

import { createTrack, getState, resetPlayerStore } from './player-store.test-helpers';
import { usePlayerStore } from './player.store';

describe('player-store/player-store.actions.sync', () => {
  beforeEach(() => {
    resetPlayerStore();
    vi.clearAllMocks();
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

  it('playNext does not append to originalQueue when not shuffled and track not in queue', () => {
    usePlayerStore.setState({ isShuffled: false, originalQueue: [] });
    getState().playNext(createTrack('3'));
    expect(getState().originalQueue).toEqual([]);
  });

  it('playNext while shuffled keeps shuffle enabled and updates queue snapshots', () => {
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
    expect(state.isShuffled).toBe(true);
    expect(state.originalQueue).toHaveLength(1);
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
