import { useAuthStore } from '@/stores/auth.store';
import { emitCurrentTimeSync, isPlaybackSyncConnected } from '@/lib/playback-sync';
import { PlayerState, usePlayerStore } from '@/stores/player.store';
import { StreamAudioQuality } from '@repo/contracts';
import { customRenderHook } from '@repo/testing/web';
import { waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePlayerAudio } from './use-player-audio';

vi.mock('@/stores/player.store', () => ({
  usePlayerStore: Object.assign(vi.fn(), {
    subscribe: vi.fn(),
  }),
}));

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('@/lib/playback-sync', () => ({
  emitCurrentTimeSync: vi.fn(),
  isPlaybackSyncConnected: vi.fn(),
}));

const originalFetch = globalThis.fetch;

function fetchJsonOk<T>(data: T) {
  return { ok: true, json: async () => data };
}

function fetchJsonErr(status: number) {
  return { ok: false, status };
}

describe('usePlayerAudio', () => {
  const setAvailableQualities = vi.fn();
  const setCurrentTime = vi.fn();
  const setDuration = vi.fn();
  const nextTrack = vi.fn();
  const pause = vi.fn();

  const defaultStore: Partial<PlayerState> = {
    currentTrack: null,
    isPlaying: false,
    volume: 0.5,
    currentTime: 0,
    playbackVersion: 0,
    activeDeviceId: '',
    localPlaybackDeviceId: '',
    quality: 'auto',
    setCurrentTime,
    setDuration,
    nextTrack,
    pause,
    repeatMode: 'off',
    setAvailableQualities,
    queue: [],
  };

  const defaultAuthStore = { accessToken: 'test-token' };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isPlaybackSyncConnected).mockReturnValue(false);
    vi.mocked(usePlayerStore).mockReturnValue(defaultStore as PlayerState);
    (usePlayerStore.subscribe as ReturnType<typeof vi.fn>).mockReturnValue(vi.fn());
    vi.mocked(useAuthStore).mockReturnValue(defaultAuthStore as ReturnType<typeof useAuthStore>);
    global.fetch = vi.fn().mockResolvedValue(fetchJsonOk({ data: [] }));
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('initialization', () => {
    it('initializes correctly', () => {
      const { result } = customRenderHook(() => usePlayerAudio());
      expect(result.current.audioRef).toBeDefined();
      expect(result.current.formatTime(65)).toBe('1:05');
      expect(result.current.formatTimeLeft(20, 100)).toBe('-1:20');
    });
  });

  describe('quality fetch', () => {
    it('fetches qualities when track changes', async () => {
      vi.mocked(usePlayerStore).mockReturnValue({
        ...defaultStore,
        currentTrack: { id: 'track-1' } as unknown,
      } as PlayerState);

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        fetchJsonOk({ data: [StreamAudioQuality.high, StreamAudioQuality.low] }),
      );

      customRenderHook(() => usePlayerAudio());

      await waitFor(() => {
        expect(setAvailableQualities).toHaveBeenCalledWith([
          'auto',
          StreamAudioQuality.high,
          StreamAudioQuality.low,
        ]);
      });
    });

    it('handles fetch qualities error', async () => {
      vi.mocked(usePlayerStore).mockReturnValue({
        ...defaultStore,
        currentTrack: { id: 'track-1' } as unknown,
      } as PlayerState);

      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

      customRenderHook(() => usePlayerAudio());

      await waitFor(() => {
        expect(setAvailableQualities).toHaveBeenCalledWith(['auto']);
      });
    });

    it('fetches qualities and handles non-array data', async () => {
      vi.mocked(usePlayerStore).mockReturnValue({
        ...defaultStore,
        currentTrack: { id: 'track-1' } as unknown,
      } as PlayerState);
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        fetchJsonOk({ data: 'not an array' }),
      );
      customRenderHook(() => usePlayerAudio());
      await waitFor(() => {
        expect(setAvailableQualities).toHaveBeenCalledWith(['auto']);
      });
    });

    it('fetches qualities and handles !res.ok', async () => {
      vi.mocked(usePlayerStore).mockReturnValue({
        ...defaultStore,
        currentTrack: { id: 'track-1' } as unknown,
      } as PlayerState);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(fetchJsonErr(500));
      customRenderHook(() => usePlayerAudio());
      await waitFor(() => {
        expect(setAvailableQualities).toHaveBeenCalledWith(['auto']);
        expect(consoleSpy).toHaveBeenCalled();
      });
      consoleSpy.mockRestore();
    });
  });

  describe('getAudioUrl', () => {
    it('returns correct audio url', () => {
      vi.mocked(usePlayerStore).mockReturnValue({
        ...defaultStore,
        currentTrack: { id: 'track-1' } as unknown,
        quality: StreamAudioQuality.high,
      } as PlayerState);

      const { result } = customRenderHook(() => usePlayerAudio());
      const url = result.current.getAudioUrl();
      expect(url).toContain('/library/tracks/track-1/stream');
      expect(url).toContain('token=test-token');
      expect(url).toContain('quality=high');
    });

    it('gets correct audio URL with no token and auto quality', () => {
      vi.mocked(useAuthStore).mockReturnValue({ accessToken: null } as ReturnType<
        typeof useAuthStore
      >);
      vi.mocked(usePlayerStore).mockReturnValue({
        ...defaultStore,
        currentTrack: { id: 'track-1' } as unknown,
        quality: 'auto',
      } as PlayerState);

      const { result } = customRenderHook(() => usePlayerAudio());
      expect(result.current.getAudioUrl()).toBe(
        'http://localhost:8000/library/tracks/track-1/stream?',
      );
    });

    it('returns empty audio URL when currentTrack is null', () => {
      vi.mocked(usePlayerStore).mockReturnValue({
        ...defaultStore,
        currentTrack: null,
      } as PlayerState);
      const { result } = customRenderHook(() => usePlayerAudio());
      expect(result.current.getAudioUrl()).toBe('');
    });
  });

  describe('handleTrackEnd', () => {
    it('calls nextTrack on track end when repeat is off and track has a next item', () => {
      vi.mocked(usePlayerStore).mockReturnValue({
        ...defaultStore,
        repeatMode: 'off',
        currentTrack: { id: 'track-1' } as unknown,
        queue: [{ track: { id: 'track-1' } }, { track: { id: 'track-2' } }] as unknown,
      } as PlayerState);
      const { result } = customRenderHook(() => usePlayerAudio());
      result.current.handleTrackEnd();
      expect(nextTrack).toHaveBeenCalled();
      expect(pause).not.toHaveBeenCalled();
    });

    it('pauses on track end when repeat is off and current track is the last item', () => {
      vi.mocked(usePlayerStore).mockReturnValue({
        ...defaultStore,
        repeatMode: 'off',
        currentTrack: { id: 'track-2' } as unknown,
        queue: [{ track: { id: 'track-1' } }, { track: { id: 'track-2' } }] as unknown,
      } as PlayerState);
      const { result } = customRenderHook(() => usePlayerAudio());
      result.current.handleTrackEnd();
      expect(pause).toHaveBeenCalled();
      expect(nextTrack).not.toHaveBeenCalled();
    });

    it('calls nextTrack on track end when repeat is all and current track is last', () => {
      vi.mocked(usePlayerStore).mockReturnValue({
        ...defaultStore,
        repeatMode: 'all',
        currentTrack: { id: 'track-2' } as unknown,
        queue: [{ track: { id: 'track-1' } }, { track: { id: 'track-2' } }] as unknown,
      } as PlayerState);
      const { result } = customRenderHook(() => usePlayerAudio());
      result.current.handleTrackEnd();
      expect(nextTrack).toHaveBeenCalled();
      expect(pause).not.toHaveBeenCalled();
    });

    it('handles track end when repeatMode is one', () => {
      vi.mocked(usePlayerStore).mockReturnValue({
        ...defaultStore,
        repeatMode: 'one',
      } as PlayerState);
      const { result } = customRenderHook(() => usePlayerAudio());
      const playMock = vi.fn();
      const audioEl = {
        currentTime: 10,
        play: playMock,
      } as unknown as HTMLAudioElement;
      (result.current.audioRef as { current: HTMLAudioElement | null }).current = audioEl;

      result.current.handleTrackEnd();
      expect(audioEl.currentTime).toBe(0);
      expect(playMock).toHaveBeenCalled();
    });

    it('does nothing if repeatMode is one but audioRef.current is null', () => {
      vi.mocked(usePlayerStore).mockReturnValue({
        ...defaultStore,
        repeatMode: 'one',
      } as PlayerState);
      const { result } = customRenderHook(() => usePlayerAudio());
      (result.current.audioRef as { current: HTMLAudioElement | null }).current = null;

      result.current.handleTrackEnd();
      expect(nextTrack).not.toHaveBeenCalled();
    });
  });

  describe('volume and time', () => {
    it('syncs volume to audio element', () => {
      vi.mocked(usePlayerStore).mockReturnValue({
        ...defaultStore,
        volume: 0.5,
      } as PlayerState);
      const { result, rerender } = customRenderHook(() => usePlayerAudio());
      const audioEl = document.createElement('audio');
      (result.current.audioRef as { current: HTMLAudioElement | null }).current = audioEl;

      vi.mocked(usePlayerStore).mockReturnValue({
        ...defaultStore,
        volume: 0.8,
      } as PlayerState);
      rerender();
      expect(audioEl.volume).toBe(0.8);
    });

    it('handles time update', () => {
      const { result } = customRenderHook(() => usePlayerAudio());
      const audioEl = { currentTime: 42 } as HTMLAudioElement;
      (result.current.audioRef as { current: HTMLAudioElement | null }).current = audioEl;
      result.current.handleTimeUpdate();
      expect(setCurrentTime).toHaveBeenCalledWith(42);
    });

    it('throttles current time sync updates from active device', () => {
      vi.mocked(isPlaybackSyncConnected).mockReturnValue(true);
      vi.mocked(usePlayerStore).mockReturnValue({
        ...defaultStore,
        currentTrack: { id: 'track-1', duration: 120 } as unknown,
        isPlaying: true,
        playbackVersion: 2,
        activeDeviceId: 'device-1',
        localPlaybackDeviceId: 'device-1',
      } as PlayerState);

      const { result } = customRenderHook(() => usePlayerAudio());
      const audioEl = { currentTime: 12.2 } as HTMLAudioElement;
      (result.current.audioRef as { current: HTMLAudioElement | null }).current = audioEl;
      const nowSpy = vi.spyOn(Date, 'now');

      nowSpy.mockReturnValue(1000);
      result.current.handleTimeUpdate();

      audioEl.currentTime = 13.4;
      nowSpy.mockReturnValue(1500);
      result.current.handleTimeUpdate();

      audioEl.currentTime = 12.9;
      nowSpy.mockReturnValue(2600);
      result.current.handleTimeUpdate();

      expect(emitCurrentTimeSync).toHaveBeenCalledTimes(1);
      nowSpy.mockRestore();
    });

    it('does not emit time sync when local client is not active device', () => {
      vi.mocked(isPlaybackSyncConnected).mockReturnValue(true);
      vi.mocked(usePlayerStore).mockReturnValue({
        ...defaultStore,
        currentTrack: { id: 'track-1', duration: 120 } as unknown,
        isPlaying: true,
        playbackVersion: 2,
        activeDeviceId: 'device-1',
        localPlaybackDeviceId: 'device-2',
      } as PlayerState);

      const { result } = customRenderHook(() => usePlayerAudio());
      const audioEl = { currentTime: 22.5 } as HTMLAudioElement;
      (result.current.audioRef as { current: HTMLAudioElement | null }).current = audioEl;

      result.current.handleTimeUpdate();

      expect(setCurrentTime).not.toHaveBeenCalled();
      expect(emitCurrentTimeSync).not.toHaveBeenCalled();
    });

    it('syncs currentTime to audio element if diff > 1', () => {
      vi.mocked(usePlayerStore).mockReturnValue({
        ...defaultStore,
        currentTime: 20,
      } as PlayerState);
      const { result, rerender } = customRenderHook(() => usePlayerAudio());
      const audioEl = { currentTime: 20 } as HTMLAudioElement;
      (result.current.audioRef as { current: HTMLAudioElement | null }).current = audioEl;

      vi.mocked(usePlayerStore).mockReturnValue({
        ...defaultStore,
        currentTime: 50,
      } as PlayerState);
      rerender();
      expect(audioEl.currentTime).toBe(50);
    });

    it('handleTimeUpdate does nothing if audioRef.current is null', () => {
      const { result } = customRenderHook(() => usePlayerAudio());
      (result.current.audioRef as { current: HTMLAudioElement | null }).current = null;
      result.current.handleTimeUpdate();
      expect(setCurrentTime).not.toHaveBeenCalled();
    });
  });

  describe('play and pause', () => {
    it('syncs isPlaying mapped to play/pause', async () => {
      vi.mocked(usePlayerStore).mockReturnValue({
        ...defaultStore,
        isPlaying: false,
        currentTrack: { id: 'track-1' } as unknown,
      } as PlayerState);
      const { result, rerender } = customRenderHook(() => usePlayerAudio());

      const playMock = vi.fn().mockResolvedValue(undefined);
      const loadMock = vi.fn();
      const pauseMock = vi.fn();
      const audioEl = {
        src: 'test',
        readyState: 0,
        play: playMock,
        pause: pauseMock,
        load: loadMock,
      } as unknown as HTMLAudioElement;

      (result.current.audioRef as { current: HTMLAudioElement | null }).current = audioEl;

      vi.mocked(usePlayerStore).mockReturnValue({
        ...defaultStore,
        isPlaying: true,
        currentTrack: { id: 'track-1' } as unknown,
      } as PlayerState);
      rerender();

      await waitFor(() => {
        expect(loadMock).toHaveBeenCalled();
        expect(playMock).toHaveBeenCalled();
      });

      vi.mocked(usePlayerStore).mockReturnValue({
        ...defaultStore,
        isPlaying: false,
        currentTrack: { id: 'track-1' } as unknown,
      } as PlayerState);
      rerender();

      expect(pauseMock).toHaveBeenCalled();
    });

    it('handles play promise rejection (AbortError)', async () => {
      vi.mocked(usePlayerStore).mockReturnValue({
        ...defaultStore,
        isPlaying: false,
        currentTrack: { id: 'track-1' } as unknown,
      } as PlayerState);
      const { result, rerender } = customRenderHook(() => usePlayerAudio());

      const abortErr = new Error('AbortError');
      abortErr.name = 'AbortError';
      const playMock = vi.fn().mockRejectedValue(abortErr);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const audioEl = {
        src: 'test',
        readyState: 1,
        play: playMock,
        load: vi.fn(),
      } as unknown as HTMLAudioElement;

      (result.current.audioRef as { current: HTMLAudioElement | null }).current = audioEl;

      vi.mocked(usePlayerStore).mockReturnValue({
        ...defaultStore,
        isPlaying: true,
        currentTrack: { id: 'track-1' } as unknown,
      } as PlayerState);
      rerender();

      await waitFor(() => {
        expect(playMock).toHaveBeenCalled();
        expect(consoleSpy).not.toHaveBeenCalled();
      });
      consoleSpy.mockRestore();
    });

    it('handles play promise rejection (Other Error)', async () => {
      vi.mocked(usePlayerStore).mockReturnValue({
        ...defaultStore,
        isPlaying: false,
        currentTrack: { id: 'track-1' } as unknown,
      } as PlayerState);
      const { result, rerender } = customRenderHook(() => usePlayerAudio());

      const otherErr = new Error('Other Error');
      const playMock = vi.fn().mockRejectedValue(otherErr);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const audioEl = {
        src: 'test',
        readyState: 1,
        play: playMock,
        load: vi.fn(),
      } as unknown as HTMLAudioElement;

      (result.current.audioRef as { current: HTMLAudioElement | null }).current = audioEl;

      vi.mocked(usePlayerStore).mockReturnValue({
        ...defaultStore,
        isPlaying: true,
        currentTrack: { id: 'track-1' } as unknown,
      } as PlayerState);
      rerender();

      await waitFor(() => {
        expect(playMock).toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalled();
      });
      consoleSpy.mockRestore();
    });
  });

  describe('loaded metadata', () => {
    it('handles loaded metadata when timeToRestoreRef is null', () => {
      const { result } = customRenderHook(() => usePlayerAudio());
      const audioEl = { duration: 120 } as HTMLAudioElement;
      (result.current.audioRef as { current: HTMLAudioElement | null }).current = audioEl;
      result.current.handleLoadedMetadata();
      expect(setDuration).toHaveBeenCalledWith(120);
    });

    it('handles handleLoadedMetadata play error', async () => {
      let subscribeCb: (state: PlayerState, prevState: PlayerState) => void = () => {};
      vi.mocked(usePlayerStore.subscribe).mockImplementation((cb) => {
        subscribeCb = cb as typeof subscribeCb;
        return vi.fn();
      });

      const { result, rerender } = customRenderHook(() => usePlayerAudio());
      const playMock = vi.fn().mockRejectedValue(new Error('Test playback err'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const audioEl = {
        currentTime: 35,
        duration: 120,
        play: playMock,
      } as unknown as HTMLAudioElement;
      (result.current.audioRef as { current: HTMLAudioElement | null }).current = audioEl;

      if (subscribeCb) {
        subscribeCb!(
          { quality: 'high', currentTrack: { id: '1' } } as PlayerState,
          { quality: 'auto', currentTrack: { id: '1' } } as PlayerState,
        );
      }

      vi.mocked(usePlayerStore).mockReturnValue({
        ...defaultStore,
        isPlaying: true,
      } as PlayerState);
      rerender();

      result.current.handleLoadedMetadata();
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });
      consoleSpy.mockRestore();
    });

    it('handles handleLoadedMetadata play abort error gracefully', async () => {
      let subscribeCb: (state: PlayerState, prevState: PlayerState) => void = () => {};
      vi.mocked(usePlayerStore.subscribe).mockImplementation((cb) => {
        subscribeCb = cb as typeof subscribeCb;
        return vi.fn();
      });

      const { result, rerender } = customRenderHook(() => usePlayerAudio());
      const err = new Error('AbortError');
      err.name = 'AbortError';
      const playMock = vi.fn().mockRejectedValue(err);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const audioEl = {
        currentTime: 35,
        duration: 120,
        play: playMock,
      } as unknown as HTMLAudioElement;
      (result.current.audioRef as { current: HTMLAudioElement | null }).current = audioEl;

      if (subscribeCb) {
        subscribeCb!(
          { quality: 'high', currentTrack: { id: '1' } } as PlayerState,
          { quality: 'auto', currentTrack: { id: '1' } } as PlayerState,
        );
      }

      vi.mocked(usePlayerStore).mockReturnValue({
        ...defaultStore,
        isPlaying: true,
      } as PlayerState);
      rerender();

      result.current.handleLoadedMetadata();
      await waitFor(() => {
        expect(consoleSpy).not.toHaveBeenCalled();
      });
      consoleSpy.mockRestore();
    });

    it('does nothing if audioRef.current is null', () => {
      const { result } = customRenderHook(() => usePlayerAudio());
      (result.current.audioRef as { current: HTMLAudioElement | null }).current = null;
      result.current.handleLoadedMetadata();
      expect(setDuration).not.toHaveBeenCalled();
    });

    it('restores time but does not play if isPlaying is false', () => {
      let subscribeCb: (state: PlayerState, prevState: PlayerState) => void = () => {};
      vi.mocked(usePlayerStore.subscribe).mockImplementation((cb) => {
        subscribeCb = cb as typeof subscribeCb;
        return vi.fn();
      });

      vi.mocked(usePlayerStore).mockReturnValue({
        ...defaultStore,
        isPlaying: false,
      } as PlayerState);

      const { result } = customRenderHook(() => usePlayerAudio());
      const playMock = vi.fn();
      const audioEl = {
        currentTime: 35,
        duration: 120,
        play: playMock,
      } as unknown as HTMLAudioElement;
      (result.current.audioRef as { current: HTMLAudioElement | null }).current = audioEl;

      if (subscribeCb) {
        subscribeCb!(
          { quality: 'high', currentTrack: { id: '1' } } as PlayerState,
          { quality: 'auto', currentTrack: { id: '1' } } as PlayerState,
        );
      }

      result.current.handleLoadedMetadata();
      expect(audioEl.currentTime).toBe(35);
      expect(setCurrentTime).toHaveBeenCalledWith(35);
      expect(playMock).not.toHaveBeenCalled();
    });
  });

  describe('store subscription', () => {
    it('sets timeToRestoreRef on quality change', () => {
      let subscribeCb: (state: PlayerState, prevState: PlayerState) => void = () => {};
      vi.mocked(usePlayerStore.subscribe).mockImplementation((cb) => {
        subscribeCb = cb as typeof subscribeCb;
        return vi.fn();
      });

      const { result, rerender } = customRenderHook(() => usePlayerAudio());
      const audioEl = {
        currentTime: 35,
        duration: 120,
        play: vi.fn().mockResolvedValue(undefined),
      } as unknown as HTMLAudioElement;
      (result.current.audioRef as { current: HTMLAudioElement | null }).current = audioEl;

      if (subscribeCb) {
        subscribeCb!(
          { quality: 'high', currentTrack: { id: '1' } } as PlayerState,
          { quality: 'auto', currentTrack: { id: '1' } } as PlayerState,
        );
      }

      vi.mocked(usePlayerStore).mockReturnValue({
        ...defaultStore,
        isPlaying: true,
      } as PlayerState);
      rerender();

      result.current.handleLoadedMetadata();
      expect(audioEl.currentTime).toBe(35);
      expect(setCurrentTime).toHaveBeenCalledWith(35);
      expect(audioEl.play).toHaveBeenCalled();
    });

    it('ignores store update if quality is the same', () => {
      let subscribeCb: (state: PlayerState, prevState: PlayerState) => void = () => {};
      vi.mocked(usePlayerStore.subscribe).mockImplementation((cb) => {
        subscribeCb = cb as typeof subscribeCb;
        return vi.fn();
      });

      const { result } = customRenderHook(() => usePlayerAudio());
      const audioEl = { currentTime: 35 } as unknown as HTMLAudioElement;
      (result.current.audioRef as { current: HTMLAudioElement | null }).current = audioEl;

      if (subscribeCb) {
        subscribeCb!(
          { quality: 'auto', currentTrack: { id: '1' } } as PlayerState,
          { quality: 'auto', currentTrack: { id: '1' } } as PlayerState,
        );
      }

      result.current.handleLoadedMetadata();
      expect(audioEl.currentTime).toBe(35);
    });

    it('ignores store update if currentTrack changes', () => {
      let subscribeCb: (state: PlayerState, prevState: PlayerState) => void = () => {};
      vi.mocked(usePlayerStore.subscribe).mockImplementation((cb) => {
        subscribeCb = cb as typeof subscribeCb;
        return vi.fn();
      });

      const { result } = customRenderHook(() => usePlayerAudio());
      const audioEl = { currentTime: 35 } as unknown as HTMLAudioElement;
      (result.current.audioRef as { current: HTMLAudioElement | null }).current = audioEl;

      if (subscribeCb) {
        subscribeCb!(
          { quality: 'high', currentTrack: { id: '2' } } as PlayerState,
          { quality: 'auto', currentTrack: { id: '1' } } as PlayerState,
        );
      }

      result.current.handleLoadedMetadata();
      expect(audioEl.currentTime).toBe(35);
    });

    it('does not set timeToRestoreRef if audioRef.current is null on store update', () => {
      let subscribeCb: (state: PlayerState, prevState: PlayerState) => void = () => {};
      vi.mocked(usePlayerStore.subscribe).mockImplementation((cb) => {
        subscribeCb = cb as typeof subscribeCb;
        return vi.fn();
      });

      const { result } = customRenderHook(() => usePlayerAudio());
      (result.current.audioRef as { current: HTMLAudioElement | null }).current = null;

      if (subscribeCb) {
        subscribeCb!(
          { quality: 'high', currentTrack: { id: '1' } } as PlayerState,
          { quality: 'auto', currentTrack: { id: '1' } } as PlayerState,
        );
      }

      const audioEl = { currentTime: 0 } as unknown as HTMLAudioElement;
      (result.current.audioRef as { current: HTMLAudioElement | null }).current = audioEl;
      result.current.handleLoadedMetadata();
      expect(audioEl.currentTime).toBe(0);
    });
  });
});
