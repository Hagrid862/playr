import { UNKNOWN_ARTIST_LABEL } from '@/lib/display-constants';
import { firePlaybackCommand, isPlaybackSyncConnected } from '@/lib/playback/sync/playback-sync';
import type { PlayerState } from '@/stores/player-store/player.store';
import { usePlayerStore } from '@/stores/player-store/player.store';
import type { PlaybackTrack } from '@repo/contracts';
import { customRenderHook } from '@repo/testing/web';
import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolvePlaybackArtworkUrl, usePlaybackMediaSession } from './usePlaybackMediaSession';

const { getState } = vi.hoisted(() => ({
  getState: vi.fn(),
}));

vi.mock('@/stores/player-store/player.store', () => ({
  usePlayerStore: Object.assign(vi.fn(), {
    getState,
    subscribe: vi.fn(() => vi.fn()),
  }),
}));

vi.mock('@/lib/playback/sync/playback-sync', () => ({
  emitCurrentTimeSync: vi.fn((t: number) => ({ kind: 'emitCurrentTimeSync', t })),
  firePlaybackCommand: vi.fn(),
  isPlaybackSyncConnected: vi.fn(),
}));

function playbackTrack(overrides: Partial<PlaybackTrack> = {}): PlaybackTrack {
  return {
    id: 'p1',
    title: 'Song',
    trackId: 't1',
    artists: ['Artist A'],
    albumName: 'Album',
    albumId: 'al1',
    albumArt: 'https://cdn.example/cover.jpg',
    duration: 180,
    explicit: false,
    ...overrides,
  };
}

function minimalPlayerState(overrides: Partial<PlayerState> = {}): PlayerState {
  const track = playbackTrack();
  return {
    currentTrack: track,
    isPlaying: true,
    volume: 1,
    currentTime: 0,
    duration: track.duration,
    quality: 'auto',
    availableQualities: ['auto'],
    queue: [],
    originalQueue: [],
    listHeadTrackIds: [],
    history: [],
    repeatMode: 'off',
    isShuffled: false,
    playbackVersion: 1,
    playbackFavorited: 'not-set',
    playbackInLibrary: false,
    activeDeviceId: 'device-local',
    localPlaybackDeviceId: 'device-local',
    playbackDevices: [],
    applyPlaybackStateFromServer: vi.fn(),
    clearSessionPlayback: vi.fn(),
    resetForLogout: vi.fn(),
    setLocalPlaybackDeviceId: vi.fn(),
    setPlaybackDevices: vi.fn(),
    playTrack: vi.fn(),
    playQueueItem: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    togglePlay: vi.fn(),
    setVolume: vi.fn(),
    setCurrentTime: vi.fn(),
    setDuration: vi.fn(),
    setQuality: vi.fn(),
    setAvailableQualities: vi.fn(),
    setQueue: vi.fn(),
    nextTrack: vi.fn(),
    previousTrack: vi.fn(),
    toggleRepeatMode: vi.fn(),
    toggleShuffle: vi.fn(),
    addToQueue: vi.fn(),
    playNext: vi.fn(),
    removeFromQueue: vi.fn(),
    reorderQueue: vi.fn(),
    addToHistory: vi.fn(),
    isQueueOpen: false,
    sidebarView: 'queue',
    toggleQueue: vi.fn(),
    setQueueOpen: vi.fn(),
    setSidebarView: vi.fn(),
    ...overrides,
  } as PlayerState;
}

function installNavigatorMediaSession(opts?: {
  omitSetPositionState?: boolean;
  setActionHandlerImpl?: typeof navigator.mediaSession.setActionHandler;
}) {
  const setActionHandler = vi.fn(opts?.setActionHandlerImpl ?? (() => {}));
  const setPositionState = vi.fn();
  Object.assign(navigator, {
    mediaSession: {
      metadata: null as MediaMetadata | null,
      playbackState: 'none' as MediaSessionPlaybackState,
      setActionHandler,
      ...(opts?.omitSetPositionState ? {} : { setPositionState }),
    },
  });
  return {
    setActionHandler,
    setPositionState: opts?.omitSetPositionState ? null : setPositionState,
  };
}

function handlerFor(setActionHandler: ReturnType<typeof vi.fn>, action: string) {
  return setActionHandler.mock.calls.find((c: unknown[]) => c[0] === action)?.[1] as
    | ((details?: MediaSessionActionDetails) => void)
    | undefined;
}

describe('resolvePlaybackArtworkUrl', () => {
  it('returns null for empty input', () => {
    expect(resolvePlaybackArtworkUrl(null)).toBe(null);
    expect(resolvePlaybackArtworkUrl('')).toBe(null);
    expect(resolvePlaybackArtworkUrl('   ')).toBe(null);
  });

  it('returns absolute http(s) URLs unchanged', () => {
    expect(resolvePlaybackArtworkUrl('https://x/c.jpg')).toBe('https://x/c.jpg');
    expect(resolvePlaybackArtworkUrl('http://x/c.jpg')).toBe('http://x/c.jpg');
  });

  it('resolves relative paths against window.location.origin', () => {
    expect(resolvePlaybackArtworkUrl('/covers/a.png')).toBe(
      `${window.location.origin}/covers/a.png`,
    );
  });

  it('returns null when URL resolution throws', () => {
    const OriginalURL = globalThis.URL;
    vi.spyOn(globalThis, 'URL').mockImplementationOnce(function MockUrl(
      input: string | URL,
      base?: string | URL,
    ) {
      if (input === 'relative/art.png') throw new TypeError('bad');
      return new OriginalURL(input, base);
    });
    expect(resolvePlaybackArtworkUrl('relative/art.png')).toBe(null);
    vi.mocked(URL).mockRestore();
  });

  it('returns null when window is undefined', () => {
    const w = globalThis.window;
    vi.stubGlobal('window', undefined);
    expect(resolvePlaybackArtworkUrl('/x')).toBe(null);
    vi.stubGlobal('window', w);
  });
});

describe('usePlaybackMediaSession', () => {
  let setActionHandler: ReturnType<typeof vi.fn>;
  let setPositionState: ReturnType<typeof vi.fn> | null;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      'MediaMetadata',
      class {
        title = '';
        artist = '';
        album = '';
        artwork: MediaImage[] = [];
        constructor(init: MediaMetadataInit) {
          this.title = init.title ?? '';
          this.artist = init.artist ?? '';
          this.album = init.album ?? '';
          this.artwork = init.artwork ?? [];
        }
      },
    );

    const nav = installNavigatorMediaSession();
    setActionHandler = nav.setActionHandler;
    setPositionState = nav.setPositionState;

    const state = minimalPlayerState();
    getState.mockImplementation(() => state);
    vi.mocked(usePlayerStore).mockImplementation((selector: (s: PlayerState) => unknown) =>
      selector(getState() as PlayerState),
    );
    vi.mocked(isPlaybackSyncConnected).mockReturnValue(true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sets metadata and action handlers when this device controls playback', () => {
    const state = minimalPlayerState();
    getState.mockImplementation(() => state);

    const audioRef = { current: document.createElement('audio') };
    customRenderHook(() => usePlaybackMediaSession(audioRef));

    const md = navigator.mediaSession.metadata as InstanceType<typeof MediaMetadata> | null;
    expect(md?.title).toBe('Song');
    expect(md?.artist).toBe('Artist A');
    expect(md?.album).toBe('Album');
    expect(md?.artwork?.[0]?.src).toBe('https://cdn.example/cover.jpg');

    expect(setActionHandler).toHaveBeenCalledWith('play', expect.any(Function));
    expect(setActionHandler).toHaveBeenCalledWith('pause', expect.any(Function));
    expect(setActionHandler).toHaveBeenCalledWith('nexttrack', expect.any(Function));
    expect(setPositionState).toHaveBeenCalled();
  });

  it('uses unknown artist label when artists array is empty and omits artwork when albumArt is null', () => {
    const state = minimalPlayerState({
      currentTrack: playbackTrack({ artists: [], albumArt: null }),
    });
    getState.mockImplementation(() => state);

    const audioRef = { current: document.createElement('audio') };
    customRenderHook(() => usePlaybackMediaSession(audioRef));

    const md = navigator.mediaSession.metadata as { artist: string; artwork: MediaImage[] } | null;
    expect(md?.artist).toBe(UNKNOWN_ARTIST_LABEL);
    expect(md?.artwork).toEqual([]);
  });

  it('clears presentation when another device is active', () => {
    const state = minimalPlayerState({
      activeDeviceId: 'remote-device',
      localPlaybackDeviceId: 'local-device',
    });
    getState.mockImplementation(() => state);

    const audioRef = { current: document.createElement('audio') };
    const { rerender } = customRenderHook(() => usePlaybackMediaSession(audioRef));

    expect(navigator.mediaSession.metadata).toBe(null);
    expect(navigator.mediaSession.playbackState).toBe('none');

    act(() => {
      state.activeDeviceId = 'local-device';
      state.localPlaybackDeviceId = 'local-device';
      rerender();
    });

    expect(navigator.mediaSession.metadata).not.toBe(null);
  });

  it('invokes resume when play action fires while controlling', () => {
    const state = minimalPlayerState();
    getState.mockImplementation(() => state);

    const audioRef = { current: document.createElement('audio') };
    customRenderHook(() => usePlaybackMediaSession(audioRef));

    const playHandler = handlerFor(setActionHandler, 'play');
    expect(playHandler).toBeTypeOf('function');
    act(() => playHandler?.());
    expect(state.resume).toHaveBeenCalledTimes(1);
  });

  it('logs when setting metadata throws', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal(
      'MediaMetadata',
      class {
        constructor() {
          throw new Error('metadata fail');
        }
      },
    );

    const state = minimalPlayerState();
    getState.mockImplementation(() => state);
    customRenderHook(() => usePlaybackMediaSession({ current: document.createElement('audio') }));

    expect(errSpy).toHaveBeenCalledWith('[MediaSession] failed to set metadata', expect.any(Error));
    errSpy.mockRestore();
  });

  it('invokes pause, stop, previousTrack, and nextTrack handlers when controlling', () => {
    const state = minimalPlayerState();
    getState.mockImplementation(() => state);
    customRenderHook(() => usePlaybackMediaSession({ current: document.createElement('audio') }));

    act(() => handlerFor(setActionHandler, 'pause')?.());
    act(() => handlerFor(setActionHandler, 'stop')?.());
    act(() => handlerFor(setActionHandler, 'previoustrack')?.());
    act(() => handlerFor(setActionHandler, 'nexttrack')?.());

    expect(state.pause).toHaveBeenCalledTimes(2);
    expect(state.previousTrack).toHaveBeenCalledTimes(1);
    expect(state.nextTrack).toHaveBeenCalledTimes(1);
  });

  it('no-ops action handlers when no longer controlling', () => {
    const state = minimalPlayerState();
    getState.mockImplementation(() => state);
    customRenderHook(() => usePlaybackMediaSession({ current: document.createElement('audio') }));

    act(() => {
      state.activeDeviceId = 'remote';
      state.localPlaybackDeviceId = 'local';
    });

    act(() => handlerFor(setActionHandler, 'pause')?.());
    expect(state.pause).not.toHaveBeenCalled();
  });

  it('short-circuits every media action handler when not controlling', () => {
    const state = minimalPlayerState();
    getState.mockImplementation(() => state);
    customRenderHook(() => usePlaybackMediaSession({ current: document.createElement('audio') }));

    act(() => {
      state.activeDeviceId = 'remote';
      state.localPlaybackDeviceId = 'local';
    });

    act(() => handlerFor(setActionHandler, 'play')?.());
    act(() => handlerFor(setActionHandler, 'pause')?.());
    act(() => handlerFor(setActionHandler, 'stop')?.());
    act(() => handlerFor(setActionHandler, 'previoustrack')?.());
    act(() => handlerFor(setActionHandler, 'nexttrack')?.());
    act(() => handlerFor(setActionHandler, 'seekbackward')?.());
    act(() =>
      handlerFor(setActionHandler, 'seekforward')?.({ seekOffset: 5 } as MediaSessionActionDetails),
    );
    act(() =>
      handlerFor(setActionHandler, 'seekto')?.({ seekTime: 12 } as MediaSessionActionDetails),
    );

    expect(state.resume).not.toHaveBeenCalled();
    expect(state.pause).not.toHaveBeenCalled();
    expect(state.previousTrack).not.toHaveBeenCalled();
    expect(state.nextTrack).not.toHaveBeenCalled();
    expect(state.setCurrentTime).not.toHaveBeenCalled();
  });

  it('seekbackward and seekforward use seekOffset and commit seek with sync', async () => {
    const state = minimalPlayerState({ currentTime: 50, duration: 100 });
    getState.mockImplementation(() => state);
    const audio = document.createElement('audio');
    Object.defineProperty(audio, 'duration', { value: 100, configurable: true });
    audio.currentTime = 50;

    customRenderHook(() => usePlaybackMediaSession({ current: audio }));

    act(() =>
      handlerFor(
        setActionHandler,
        'seekbackward',
      )?.({ seekOffset: 20 } as MediaSessionActionDetails),
    );
    expect(state.setCurrentTime).toHaveBeenCalledWith(30);
    expect(firePlaybackCommand).toHaveBeenCalled();

    vi.mocked(firePlaybackCommand).mockClear();
    vi.mocked(state.setCurrentTime).mockClear();

    act(() =>
      handlerFor(
        setActionHandler,
        'seekforward',
      )?.({ seekOffset: 15 } as MediaSessionActionDetails),
    );
    expect(state.setCurrentTime).toHaveBeenCalledWith(45);
    expect(firePlaybackCommand).toHaveBeenCalled();

    await act(async () => {
      await Promise.resolve();
    });
  });

  it('seekbackward uses default offset when seekOffset is missing', () => {
    const state = minimalPlayerState({ currentTime: 25, duration: 100 });
    getState.mockImplementation(() => state);
    const audio = document.createElement('audio');
    Object.defineProperty(audio, 'duration', { value: 100, configurable: true });
    audio.currentTime = 25;

    customRenderHook(() => usePlaybackMediaSession({ current: audio }));
    act(() => handlerFor(setActionHandler, 'seekbackward')?.());
    expect(state.setCurrentTime).toHaveBeenCalledWith(15);
  });

  it('seekbackward uses store currentTime when audio element is absent', () => {
    const state = minimalPlayerState({ currentTime: 40, duration: 100 });
    getState.mockImplementation(() => state);
    customRenderHook(() => usePlaybackMediaSession({ current: null }));
    act(() =>
      handlerFor(
        setActionHandler,
        'seekbackward',
      )?.({ seekOffset: 10 } as MediaSessionActionDetails),
    );
    expect(state.setCurrentTime).toHaveBeenCalledWith(30);
  });

  it('seekforward uses store currentTime when audio ref is null', () => {
    const state = minimalPlayerState({ currentTime: 15, duration: 100 });
    getState.mockImplementation(() => state);
    customRenderHook(() => usePlaybackMediaSession({ current: null }));
    act(() =>
      handlerFor(setActionHandler, 'seekforward')?.({ seekOffset: 5 } as MediaSessionActionDetails),
    );
    expect(state.setCurrentTime).toHaveBeenCalledWith(20);
  });

  it('seekforward uses default seek offset when details omit seekOffset', () => {
    const state = minimalPlayerState({ currentTime: 20, duration: 100 });
    getState.mockImplementation(() => state);
    const audio = document.createElement('audio');
    Object.defineProperty(audio, 'duration', { value: 100, configurable: true });
    audio.currentTime = 20;

    customRenderHook(() => usePlaybackMediaSession({ current: audio }));
    act(() => handlerFor(setActionHandler, 'seekforward')?.());
    expect(state.setCurrentTime).toHaveBeenCalledWith(30);
  });

  it('seekto no-ops when seekTime is null or not finite', () => {
    const state = minimalPlayerState();
    getState.mockImplementation(() => state);
    customRenderHook(() => usePlaybackMediaSession({ current: document.createElement('audio') }));

    vi.mocked(state.setCurrentTime).mockClear();
    act(() => handlerFor(setActionHandler, 'seekto')?.({} as MediaSessionActionDetails));
    act(() =>
      handlerFor(
        setActionHandler,
        'seekto',
      )?.({ seekTime: Number.NaN } as MediaSessionActionDetails),
    );
    expect(state.setCurrentTime).not.toHaveBeenCalled();
  });

  it('seekto commits when seekTime is valid', () => {
    const state = minimalPlayerState({ duration: 200 });
    getState.mockImplementation(() => state);
    const audio = document.createElement('audio');
    Object.defineProperty(audio, 'duration', { value: 200, configurable: true });

    customRenderHook(() => usePlaybackMediaSession({ current: audio }));
    act(() =>
      handlerFor(setActionHandler, 'seekto')?.({ seekTime: 42 } as MediaSessionActionDetails),
    );
    expect(state.setCurrentTime).toHaveBeenCalledWith(42);
    expect(audio.currentTime).toBe(42);
  });

  it('commitSeek uses store duration first and skips firePlaybackCommand when playbackVersion is 0', () => {
    vi.mocked(isPlaybackSyncConnected).mockReturnValue(true);
    const state = minimalPlayerState({ playbackVersion: 0, duration: 80, currentTime: 0 });
    getState.mockImplementation(() => state);
    const audio = document.createElement('audio');
    Object.defineProperty(audio, 'duration', { value: 999, configurable: true });
    audio.currentTime = 0;

    customRenderHook(() => usePlaybackMediaSession({ current: audio }));
    vi.mocked(firePlaybackCommand).mockClear();

    act(() =>
      handlerFor(setActionHandler, 'seekto')?.({ seekTime: 100 } as MediaSessionActionDetails),
    );
    expect(state.setCurrentTime).toHaveBeenCalledWith(80);
    expect(firePlaybackCommand).not.toHaveBeenCalled();
  });

  it('commitSeek uses audio duration when store duration is NaN', () => {
    const state = minimalPlayerState({ duration: Number.NaN, currentTime: 0 });
    getState.mockImplementation(() => state);
    const audio = document.createElement('audio');
    Object.defineProperty(audio, 'duration', { value: 55, configurable: true });

    customRenderHook(() => usePlaybackMediaSession({ current: audio }));
    act(() =>
      handlerFor(setActionHandler, 'seekto')?.({ seekTime: 99 } as MediaSessionActionDetails),
    );
    expect(state.setCurrentTime).toHaveBeenCalledWith(55);
  });

  it('commitSeek uses audio duration when store duration is zero', () => {
    const state = minimalPlayerState({ duration: 0, currentTime: 0 });
    getState.mockImplementation(() => state);
    const audio = document.createElement('audio');
    Object.defineProperty(audio, 'duration', { value: 60, configurable: true });

    customRenderHook(() => usePlaybackMediaSession({ current: audio }));
    act(() =>
      handlerFor(setActionHandler, 'seekto')?.({ seekTime: 99 } as MediaSessionActionDetails),
    );
    expect(state.setCurrentTime).toHaveBeenCalledWith(60);
  });

  it('commitSeek keeps seek time as max when store and audio duration are unusable', () => {
    const state = minimalPlayerState({
      duration: Number.NaN,
      currentTime: 0,
      playbackVersion: 0,
    });
    getState.mockImplementation(() => state);
    vi.mocked(isPlaybackSyncConnected).mockReturnValue(true);

    customRenderHook(() => usePlaybackMediaSession({ current: null }));
    act(() =>
      handlerFor(setActionHandler, 'seekto')?.({ seekTime: 42 } as MediaSessionActionDetails),
    );
    expect(state.setCurrentTime).toHaveBeenCalledWith(42);
  });

  it('commitSeek works without an audio element', () => {
    const state = minimalPlayerState({ duration: 50, currentTime: 10 });
    getState.mockImplementation(() => state);
    customRenderHook(() => usePlaybackMediaSession({ current: null }));

    act(() =>
      handlerFor(setActionHandler, 'seekto')?.({ seekTime: 40 } as MediaSessionActionDetails),
    );
    expect(state.setCurrentTime).toHaveBeenCalledWith(40);
  });

  it('does not fire sync when disconnected', () => {
    vi.mocked(isPlaybackSyncConnected).mockReturnValue(false);
    const state = minimalPlayerState();
    getState.mockImplementation(() => state);
    customRenderHook(() => usePlaybackMediaSession({ current: document.createElement('audio') }));

    vi.mocked(firePlaybackCommand).mockClear();
    act(() =>
      handlerFor(setActionHandler, 'seekforward')?.({ seekOffset: 5 } as MediaSessionActionDetails),
    );
    expect(firePlaybackCommand).not.toHaveBeenCalled();
  });

  it('sets playbackState to paused when not playing', () => {
    const state = minimalPlayerState({ isPlaying: false });
    getState.mockImplementation(() => state);
    customRenderHook(() => usePlaybackMediaSession({ current: document.createElement('audio') }));
    expect(navigator.mediaSession.playbackState).toBe('paused');
  });

  it('swallows setActionHandler errors for unsupported actions', () => {
    setActionHandler.mockImplementation(() => {
      throw new DOMException('not supported');
    });
    const state = minimalPlayerState();
    getState.mockImplementation(() => state);
    expect(() =>
      customRenderHook(() => usePlaybackMediaSession({ current: document.createElement('audio') })),
    ).not.toThrow();
  });

  it('clears position state when flush sees invalid duration', () => {
    const state = minimalPlayerState({ duration: 0, isPlaying: true });
    getState.mockImplementation(() => state);
    const audio = document.createElement('audio');
    Object.defineProperty(audio, 'duration', { value: NaN, configurable: true });

    customRenderHook(() => usePlaybackMediaSession({ current: audio }));
    expect(setPositionState).toHaveBeenCalledWith(null);
  });

  it('uses audio duration for position state when store duration is zero', () => {
    const state = minimalPlayerState({ duration: 0, currentTime: 0, isPlaying: true });
    getState.mockImplementation(() => state);
    const audio = document.createElement('audio');
    Object.defineProperty(audio, 'duration', { value: 100, configurable: true });
    audio.currentTime = 33;

    setPositionState!.mockClear();
    customRenderHook(() => usePlaybackMediaSession({ current: audio }));
    expect(setPositionState).toHaveBeenCalledWith(
      expect.objectContaining({ duration: 100, position: 33, playbackRate: 1 }),
    );
  });

  it('uses playbackRate 1 when paused in position state', () => {
    const audio = document.createElement('audio');
    Object.defineProperty(audio, 'duration', { value: 50, configurable: true });
    audio.currentTime = 10;
    const state = minimalPlayerState({ isPlaying: false, duration: 50, currentTime: 10 });
    getState.mockImplementation(() => state);
    setPositionState!.mockClear();
    customRenderHook(() => usePlaybackMediaSession({ current: audio }));
    expect(setPositionState).toHaveBeenCalledWith(
      expect.objectContaining({ playbackRate: 1, duration: 50, position: 10 }),
    );
  });

  it('swallows setPositionState errors when updating position', () => {
    setPositionState!.mockImplementation(() => {
      throw new Error('invalid');
    });
    const state = minimalPlayerState();
    getState.mockImplementation(() => state);
    expect(() =>
      customRenderHook(() => usePlaybackMediaSession({ current: document.createElement('audio') })),
    ).not.toThrow();
  });

  it('returns early when mediaSession is missing', () => {
    const orig = navigator.mediaSession;
    // @ts-expect-error test stub
    delete navigator.mediaSession;
    const state = minimalPlayerState();
    getState.mockImplementation(() => state);
    customRenderHook(() => usePlaybackMediaSession({ current: document.createElement('audio') }));
    Object.assign(navigator, { mediaSession: orig });
  });

  it('clearMediaSessionPresentation returns when navigator has no mediaSession', () => {
    const origNav = globalThis.navigator;
    vi.stubGlobal('navigator', { userAgent: 'vitest' } as Navigator);
    const state = minimalPlayerState({ currentTrack: null });
    getState.mockImplementation(() => state);
    customRenderHook(() => usePlaybackMediaSession({ current: null }));
    vi.stubGlobal('navigator', origNav);
  });

  it('clearMediaSessionPresentation returns when mediaSession is removed before viewer unmount', () => {
    const state = minimalPlayerState({
      activeDeviceId: 'remote',
      localPlaybackDeviceId: 'local',
    });
    getState.mockImplementation(() => state);
    const { unmount } = customRenderHook(() =>
      usePlaybackMediaSession({ current: document.createElement('audio') }),
    );
    // @ts-expect-error test teardown path
    delete navigator.mediaSession;
    unmount();
  });

  it('clearMediaSessionPresentation returns when navigator is undefined on unmount', () => {
    const state = minimalPlayerState({ currentTrack: null });
    getState.mockImplementation(() => state);
    const { unmount } = customRenderHook(() => usePlaybackMediaSession({ current: null }));
    const orig = globalThis.navigator;
    vi.stubGlobal('navigator', undefined);
    try {
      unmount();
    } finally {
      vi.stubGlobal('navigator', orig);
    }
  });

  it('flushPositionState returns when setPositionState is missing (post-seek microtask)', async () => {
    const state = minimalPlayerState({ duration: 100, currentTime: 50 });
    getState.mockImplementation(() => state);
    const { mediaSession } = navigator;
    const ms = mediaSession as MediaSession & {
      setPositionState?: typeof mediaSession.setPositionState;
    };
    const saved = ms.setPositionState;
    // @ts-expect-error remove for flushPositionState inner guard
    delete ms.setPositionState;

    customRenderHook(() => usePlaybackMediaSession({ current: document.createElement('audio') }));
    act(() =>
      handlerFor(setActionHandler, 'seekforward')?.({ seekOffset: 1 } as MediaSessionActionDetails),
    );
    await act(async () => {
      await Promise.resolve();
    });

    ms.setPositionState = saved;
  });

  it('returns early when setPositionState is not available', () => {
    installNavigatorMediaSession({ omitSetPositionState: true });
    const state = minimalPlayerState();
    getState.mockImplementation(() => state);
    expect(() =>
      customRenderHook(() => usePlaybackMediaSession({ current: document.createElement('audio') })),
    ).not.toThrow();
  });

  it('advances position interval while controlling and clears on unmount', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const state = minimalPlayerState();
    getState.mockImplementation(() => state);
    const audioRef = { current: document.createElement('audio') };
    const { unmount } = customRenderHook(() => usePlaybackMediaSession(audioRef));
    const afterMount = setPositionState!.mock.calls.length;
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(setPositionState!.mock.calls.length).toBeGreaterThan(afterMount);
    unmount();
    vi.useRealTimers();
  });

  it('handles navigator undefined during position effect cleanup', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const state = minimalPlayerState();
    getState.mockImplementation(() => state);
    const { unmount } = customRenderHook(() =>
      usePlaybackMediaSession({ current: document.createElement('audio') }),
    );
    const orig = globalThis.navigator;
    vi.stubGlobal('navigator', undefined);
    try {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      unmount();
    } finally {
      vi.stubGlobal('navigator', orig);
    }
    vi.useRealTimers();
  });

  it('swallows clearPositionState when setPositionState throws on null', () => {
    setPositionState!.mockImplementation(() => {
      throw new DOMException('bad');
    });
    const state = minimalPlayerState({
      activeDeviceId: 'remote',
      localPlaybackDeviceId: 'local',
    });
    getState.mockImplementation(() => state);
    expect(() =>
      customRenderHook(() => usePlaybackMediaSession({ current: document.createElement('audio') })),
    ).not.toThrow();
  });

  it('unmount clears action handlers with null', () => {
    const state = minimalPlayerState();
    getState.mockImplementation(() => state);
    const { unmount } = customRenderHook(() =>
      usePlaybackMediaSession({ current: document.createElement('audio') }),
    );
    setActionHandler.mockClear();
    unmount();
    expect(setActionHandler).toHaveBeenCalledWith('play', null);
  });

  it('metadata effect cleanup skips action handler clear when navigator is undefined', () => {
    const state = minimalPlayerState();
    getState.mockImplementation(() => state);
    const { unmount } = customRenderHook(() =>
      usePlaybackMediaSession({ current: document.createElement('audio') }),
    );
    const orig = globalThis.navigator;
    vi.stubGlobal('navigator', undefined);
    try {
      unmount();
    } finally {
      vi.stubGlobal('navigator', orig);
    }
  });
});
