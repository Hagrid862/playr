import * as playbackSync from '@/lib/playback/sync/playback-sync';
import { PlayerState, usePlayerStore } from '@/stores/player-store/player.store';
import { PlaybackTrack } from '@repo/contracts';
import { customRender } from '@repo/testing/web';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPlayerStateMock } from '../test-utils/player-test-utils';
import { PlayerFullPage } from './PlayerFullPage';

const playbackTrackFixture = (
  id: string,
  overrides: Partial<PlaybackTrack> = {},
): PlaybackTrack => ({
  id,
  title: 'Test Song',
  trackId: id,
  artists: ['Artist A'],
  albumName: 'Test Album',
  albumId: 'album-1',
  albumArt: null,
  duration: 180,
  explicit: false,
  ...overrides,
});

const mockUsePlayerStore = vi.hoisted(() =>
  Object.assign(vi.fn(), { setState: vi.fn(), getState: vi.fn() }),
);

vi.mock('@/stores/player-store/player.store', () => ({
  usePlayerStore: mockUsePlayerStore,
}));

vi.mock('@/lib/playback/sync/playback-sync', () => ({
  emitFavoriteStateSync: vi.fn(),
  emitCurrentTimeSync: vi.fn(),
  firePlaybackCommand: vi.fn((cb: () => void) => cb()),
  isPlaybackSyncConnected: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: PropsWithChildren) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

describe('PlayerFullPage', () => {
  const togglePlay = vi.fn();
  const toggleShuffle = vi.fn();
  const toggleRepeatMode = vi.fn();
  const previousTrack = vi.fn();
  const nextTrack = vi.fn();
  const setCurrentTime = vi.fn();
  const setVolume = vi.fn();
  const setPlayerExpanded = vi.fn();
  const setQueueOpen = vi.fn();
  const setSidebarView = vi.fn();

  const buildState = (overrides: Partial<PlayerState> = {}): PlayerState =>
    createPlayerStateMock({
      currentTrack: null,
      isPlaying: false,
      isPlayerExpanded: true,
      togglePlay,
      toggleShuffle,
      toggleRepeatMode,
      previousTrack,
      nextTrack,
      currentTime: 0,
      duration: 0,
      playbackFavorited: 'not-set' as const,
      playbackVersion: 0,
      setCurrentTime,
      volume: 0.75,
      setVolume,
      setPlayerExpanded,
      repeatMode: 'off',
      isShuffled: false,
      isQueueOpen: false,
      sidebarView: 'queue',
      setQueueOpen,
      setSidebarView,
      ...overrides,
    });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePlayerStore).mockReturnValue(buildState());
    vi.mocked(playbackSync.emitFavoriteStateSync).mockResolvedValue();
    vi.mocked(playbackSync.isPlaybackSyncConnected).mockReturnValue(true);
  });

  describe('visibility', () => {
    it('renders when isPlayerExpanded is true', () => {
      customRender(<PlayerFullPage />);
      expect(screen.getByText('Now Playing')).toBeInTheDocument();
    });

    it('does not render content when isPlayerExpanded is false', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({ isPlayerExpanded: false }),
      );

      customRender(<PlayerFullPage />);
      expect(screen.queryByText('Now Playing')).not.toBeInTheDocument();
    });
  });

  describe('rendering', () => {
    it('renders header with Now Playing label and close button', () => {
      customRender(<PlayerFullPage />);
      expect(screen.getByText('Now Playing')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Close player' })).toBeInTheDocument();
    });

    it('renders track info', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: playbackTrackFixture('1', {
            title: 'My Song',
            artists: ['Artist A', 'Artist B'],
          }),
          playbackVersion: 1,
        }),
      );

      customRender(<PlayerFullPage />);
      expect(screen.getByText('My Song')).toBeInTheDocument();
      expect(screen.getByText('Artist A, Artist B')).toBeInTheDocument();
    });

    it('renders unknown artist label when no artists', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: playbackTrackFixture('1', { artists: [] }),
          playbackVersion: 1,
        }),
      );

      customRender(<PlayerFullPage />);
      expect(screen.getByText('Unknown artist')).toBeInTheDocument();
    });

    it('renders default title when no track', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({ currentTrack: null }),
      );

      customRender(<PlayerFullPage />);
      expect(screen.getByText('No track selected')).toBeInTheDocument();
    });

    it('renders album art when cover available', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: playbackTrackFixture('1', {
            albumArt: 'http://example.com/cover-art.jpg',
          }),
          playbackVersion: 1,
        }),
      );

      customRender(<PlayerFullPage />);
      const img = screen.getByRole('presentation');
      expect(img).toHaveAttribute('src', 'http://example.com/cover-art.jpg');
    });

    it('renders MusicNotes placeholder when no cover', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: playbackTrackFixture('1', { albumArt: undefined as unknown as null }),
          playbackVersion: 1,
        }),
      );

      customRender(<PlayerFullPage />);
      expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
    });

    it('renders all transport controls', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: playbackTrackFixture('1'),
          playbackVersion: 1,
        }),
      );

      customRender(<PlayerFullPage />);

      expect(screen.getByRole('button', { name: 'Toggle Shuffle' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Previous Track' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Next Track' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Toggle Repeat' })).toBeInTheDocument();
    });

    it('renders Pause button when isPlaying is true', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: playbackTrackFixture('1'),
          playbackVersion: 1,
          isPlaying: true,
        }),
      );

      customRender(<PlayerFullPage />);
      expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    });

    it('renders Repeat Once when repeatMode is one', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: playbackTrackFixture('1'),
          playbackVersion: 1,
          repeatMode: 'one',
        }),
      );

      customRender(<PlayerFullPage />);
      expect(screen.getByRole('button', { name: 'Repeat Once' })).toBeInTheDocument();
    });

    it('renders Lyrics and Queue toggle buttons', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: playbackTrackFixture('1'),
          playbackVersion: 1,
        }),
      );

      customRender(<PlayerFullPage />);
      expect(screen.getByRole('button', { name: 'Lyrics' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Queue' })).toBeInTheDocument();
    });

    it('shows progress time labels', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: playbackTrackFixture('1', { duration: 200 }),
          playbackVersion: 1,
          currentTime: 30,
          duration: 200,
        }),
      );

      customRender(<PlayerFullPage />);
      expect(screen.getByText('0:30')).toBeInTheDocument();
      expect(screen.getByText('-2:50')).toBeInTheDocument();
    });

    it('shows --:-- for time left when duration is 0', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: playbackTrackFixture('1'),
          playbackVersion: 1,
          currentTime: 0,
          duration: 0,
        }),
      );

      customRender(<PlayerFullPage />);
      expect(screen.getByText('--:--')).toBeInTheDocument();
    });
  });

  describe('close button', () => {
    it('calls setPlayerExpanded(false) when close button clicked', () => {
      customRender(<PlayerFullPage />);
      fireEvent.click(screen.getByRole('button', { name: 'Close player' }));
      expect(setPlayerExpanded).toHaveBeenCalledWith(false);
    });
  });

  describe('transport controls', () => {
    it('calls togglePlay when play button clicked', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: playbackTrackFixture('1'),
          playbackVersion: 1,
        }),
      );

      customRender(<PlayerFullPage />);
      fireEvent.click(screen.getByRole('button', { name: 'Play' }));
      expect(togglePlay).toHaveBeenCalled();
    });

    it('calls toggleShuffle when shuffle button clicked', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: playbackTrackFixture('1'),
          playbackVersion: 1,
        }),
      );

      customRender(<PlayerFullPage />);
      fireEvent.click(screen.getByRole('button', { name: 'Toggle Shuffle' }));
      expect(toggleShuffle).toHaveBeenCalled();
    });

    it('calls toggleRepeatMode when repeat button clicked', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: playbackTrackFixture('1'),
          playbackVersion: 1,
        }),
      );

      customRender(<PlayerFullPage />);
      fireEvent.click(screen.getByRole('button', { name: 'Toggle Repeat' }));
      expect(toggleRepeatMode).toHaveBeenCalled();
    });

    it('calls previousTrack when previous button clicked', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: playbackTrackFixture('1'),
          playbackVersion: 1,
        }),
      );

      customRender(<PlayerFullPage />);
      fireEvent.click(screen.getByRole('button', { name: 'Previous Track' }));
      expect(previousTrack).toHaveBeenCalled();
    });

    it('calls nextTrack when next button clicked', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: playbackTrackFixture('1'),
          playbackVersion: 1,
        }),
      );

      customRender(<PlayerFullPage />);
      fireEvent.click(screen.getByRole('button', { name: 'Next Track' }));
      expect(nextTrack).toHaveBeenCalled();
    });
  });

  describe('favorite button', () => {
    it('is disabled when no track', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: null,
          playbackVersion: 1,
        }),
      );

      customRender(<PlayerFullPage />);
      const favBtn = screen.getByRole('button', { name: 'Favorite' });
      expect(favBtn).toBeDisabled();
    });

    it('is disabled when playbackVersion is 0', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: playbackTrackFixture('1'),
          playbackVersion: 0,
        }),
      );

      customRender(<PlayerFullPage />);
      const favBtn = screen.getByRole('button', { name: 'Favorite' });
      expect(favBtn).toBeDisabled();
    });

    it('toggles favorite and syncs', async () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: playbackTrackFixture('1'),
          playbackVersion: 1,
          playbackFavorited: 'not-set',
        }),
      );

      customRender(<PlayerFullPage />);
      fireEvent.click(screen.getByRole('button', { name: 'Favorite' }));

      expect(mockUsePlayerStore.setState).toHaveBeenCalledWith({ playbackFavorited: 'favorited' });
      expect(playbackSync.emitFavoriteStateSync).toHaveBeenCalledWith('favorited');
    });

    it('un-favorites when already favorited', async () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: playbackTrackFixture('1'),
          playbackVersion: 1,
          playbackFavorited: 'favorited',
        }),
      );

      customRender(<PlayerFullPage />);
      fireEvent.click(screen.getByRole('button', { name: 'Favorite' }));

      expect(mockUsePlayerStore.setState).toHaveBeenCalledWith({ playbackFavorited: 'not-set' });
      expect(playbackSync.emitFavoriteStateSync).toHaveBeenCalledWith('not-set');
    });

    it('rolls back on sync failure', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: playbackTrackFixture('1'),
          playbackVersion: 1,
          playbackFavorited: 'not-set',
        }),
      );
      vi.mocked(playbackSync.emitFavoriteStateSync).mockRejectedValue(new Error('sync failed'));

      customRender(<PlayerFullPage />);
      fireEvent.click(screen.getByRole('button', { name: 'Favorite' }));

      await waitFor(() => {
        expect(mockUsePlayerStore.setState).toHaveBeenCalledWith({ playbackFavorited: 'not-set' });
      });
      expect(mockUsePlayerStore.setState).toHaveBeenCalledWith({ playbackFavorited: 'favorited' });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('sidebar toggles', () => {
    it('opens lyrics sidebar when lyrics clicked and queue closed', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: playbackTrackFixture('1'),
          playbackVersion: 1,
          isQueueOpen: false,
          sidebarView: 'queue',
        }),
      );

      customRender(<PlayerFullPage />);
      fireEvent.click(screen.getByRole('button', { name: 'Lyrics' }));
      expect(setSidebarView).toHaveBeenCalledWith('lyrics');
      expect(setQueueOpen).toHaveBeenCalledWith(true);
    });

    it('closes sidebar when lyrics clicked and already showing lyrics', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: playbackTrackFixture('1'),
          playbackVersion: 1,
          isQueueOpen: true,
          sidebarView: 'lyrics',
        }),
      );

      customRender(<PlayerFullPage />);
      fireEvent.click(screen.getByRole('button', { name: 'Lyrics' }));
      expect(setQueueOpen).toHaveBeenCalledWith(false);
    });

    it('opens queue sidebar when queue clicked and queue closed', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: playbackTrackFixture('1'),
          playbackVersion: 1,
          isQueueOpen: false,
          sidebarView: 'lyrics',
        }),
      );

      customRender(<PlayerFullPage />);
      fireEvent.click(screen.getByRole('button', { name: 'Queue' }));
      expect(setSidebarView).toHaveBeenCalledWith('queue');
      expect(setQueueOpen).toHaveBeenCalledWith(true);
    });

    it('closes sidebar when queue clicked and already showing queue', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: playbackTrackFixture('1'),
          playbackVersion: 1,
          isQueueOpen: true,
          sidebarView: 'queue',
        }),
      );

      customRender(<PlayerFullPage />);
      fireEvent.click(screen.getByRole('button', { name: 'Queue' }));
      expect(setQueueOpen).toHaveBeenCalledWith(false);
    });
  });

  describe('volume control', () => {
    it('renders volume slider', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: playbackTrackFixture('1'),
          playbackVersion: 1,
          volume: 0.5,
        }),
      );

      customRender(<PlayerFullPage />);

      // There are two sliders: progress and volume
      const sliders = screen.getAllByRole('slider');
      expect(sliders.length).toBe(2);
    });
  });

  describe('visual states', () => {
    it('shows emerald color for active shuffle', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: playbackTrackFixture('1'),
          playbackVersion: 1,
          isShuffled: true,
        }),
      );

      customRender(<PlayerFullPage />);
      const shuffleBtn = screen.getByRole('button', { name: 'Toggle Shuffle' });
      expect(shuffleBtn.className).toContain('text-emerald-400');
    });

    it('shows emerald color for active repeat', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: playbackTrackFixture('1'),
          playbackVersion: 1,
          repeatMode: 'all',
        }),
      );

      customRender(<PlayerFullPage />);
      const repeatBtn = screen.getByRole('button', { name: 'Toggle Repeat' });
      expect(repeatBtn.className).toContain('text-emerald-400');
    });

    it('shows emerald color for favorited track', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: playbackTrackFixture('1'),
          playbackVersion: 1,
          playbackFavorited: 'favorited',
        }),
      );

      customRender(<PlayerFullPage />);
      const favBtn = screen.getByRole('button', { name: 'Favorite' });
      expect(favBtn.className).toContain('text-emerald-400');
    });

    it('highlights lyrics button when lyrics sidebar is open', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: playbackTrackFixture('1'),
          playbackVersion: 1,
          isQueueOpen: true,
          sidebarView: 'lyrics',
        }),
      );

      customRender(<PlayerFullPage />);
      const lyricsBtn = screen.getByRole('button', { name: 'Lyrics' });
      expect(lyricsBtn.className).toContain('text-white');
    });

    it('highlights queue button when queue sidebar is open', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: playbackTrackFixture('1'),
          playbackVersion: 1,
          isQueueOpen: true,
          sidebarView: 'queue',
        }),
      );

      customRender(<PlayerFullPage />);
      const queueBtn = screen.getByRole('button', { name: 'Queue' });
      expect(queueBtn.className).toContain('text-white');
    });
  });

  describe('body scroll lock', () => {
    it('sets body overflow to hidden when expanded', () => {
      expect(document.body.style.overflow).not.toBe('hidden');

      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({ isPlayerExpanded: true }),
      );

      customRender(<PlayerFullPage />);
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('clears body overflow when not expanded', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({ isPlayerExpanded: false }),
      );

      customRender(<PlayerFullPage />);
      expect(document.body.style.overflow).toBe('');
    });
  });
});
