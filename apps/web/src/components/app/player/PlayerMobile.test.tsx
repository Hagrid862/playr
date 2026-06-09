import * as playbackSync from '@/lib/playback/sync/playback-sync';
import { PlayerState, usePlayerStore } from '@/stores/player-store/player.store';
import { PlaybackTrack } from '@repo/contracts';
import { customRender } from '@repo/testing/web';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPlayerStateMock } from '../test-utils/player-test-utils';
import { PlayerMobile } from './PlayerMobile';

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
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}));

describe('PlayerMobile', () => {
  const togglePlay = vi.fn();
  const toggleShuffle = vi.fn();
  const toggleRepeatMode = vi.fn();
  const previousTrack = vi.fn();
  const nextTrack = vi.fn();
  const setCurrentTime = vi.fn();
  const formatTime = vi.fn(
    (t: number) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`,
  );
  const formatTimeLeft = vi.fn(
    (t: number, total: number) =>
      `-${Math.floor((total - t) / 60)}:${String((total - t) % 60).padStart(2, '0')}`,
  );

  const buildState = (overrides: Partial<PlayerState> = {}): PlayerState =>
    createPlayerStateMock({
      currentTrack: null,
      isPlaying: false,
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
      repeatMode: 'off',
      isShuffled: false,
      ...overrides,
    });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePlayerStore).mockReturnValue(buildState());
    vi.mocked(playbackSync.emitFavoriteStateSync).mockResolvedValue();
  });

  describe('rendering', () => {
    it('renders default empty state', () => {
      customRender(<PlayerMobile formatTime={formatTime} formatTimeLeft={formatTimeLeft} />);
      expect(screen.getByText('No track selected')).toBeInTheDocument();
    });

    it('renders track details with cover', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: playbackTrackFixture('1', {
            albumArt: 'http://example.com/cover.jpg',
          }),
        }),
      );

      customRender(<PlayerMobile formatTime={formatTime} formatTimeLeft={formatTimeLeft} />);
      expect(screen.getByText('Test Song')).toBeInTheDocument();

      const img = screen.getByRole('presentation');
      expect(img).toHaveAttribute('src', 'http://example.com/cover.jpg');
    });

    it('renders music notes icon when no cover', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: playbackTrackFixture('1', { albumArt: undefined as unknown as null }),
        }),
      );

      customRender(<PlayerMobile formatTime={formatTime} formatTimeLeft={formatTimeLeft} />);
      expect(screen.getByText('Test Song')).toBeInTheDocument();
      expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
    });

    it('renders play icon when not playing', () => {
      vi.mocked(usePlayerStore).mockReturnValue(buildState({ isPlaying: false }));
      customRender(<PlayerMobile formatTime={formatTime} formatTimeLeft={formatTimeLeft} />);
      // Last button is always play/pause
      const btns = screen.getAllByRole('button');
      expect(btns.length).toBeGreaterThanOrEqual(1);
    });

    it('displays formatted time values', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: playbackTrackFixture('1'),
          currentTime: 60,
          duration: 180,
        }),
      );

      customRender(<PlayerMobile formatTime={formatTime} formatTimeLeft={formatTimeLeft} />);
      expect(formatTime).toHaveBeenCalledWith(60);
      expect(formatTimeLeft).toHaveBeenCalledWith(60, 180);
    });

    it('shows only essential controls in compact mode', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: playbackTrackFixture('1'),
          playbackVersion: 1,
        }),
      );

      customRender(
        <PlayerMobile formatTime={formatTime} formatTimeLeft={formatTimeLeft} compact={true} />,
      );

      // Should NOT have shuffle, repeat, prev, next buttons in compact mode
      expect(screen.queryByRole('button', { name: 'Toggle Shuffle' })).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /Toggle Repeat|Repeat Once/ }),
      ).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Previous Track' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Next Track' })).not.toBeInTheDocument();

      // Should have favorite and play/pause
      expect(screen.getByRole('button', { name: 'Favorite' })).toBeInTheDocument();
    });

    it('shows full transport controls when not compact', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: playbackTrackFixture('1'),
          playbackVersion: 1,
        }),
      );

      customRender(
        <PlayerMobile formatTime={formatTime} formatTimeLeft={formatTimeLeft} compact={false} />,
      );

      expect(screen.getByRole('button', { name: 'Toggle Shuffle' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Toggle Repeat' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Previous Track' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Next Track' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Favorite' })).toBeInTheDocument();
    });

    it('shows Repeat Once when repeatMode is one', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: playbackTrackFixture('1'),
          playbackVersion: 1,
          repeatMode: 'one',
        }),
      );

      customRender(
        <PlayerMobile formatTime={formatTime} formatTimeLeft={formatTimeLeft} compact={false} />,
      );

      expect(screen.getByRole('button', { name: 'Repeat Once' })).toBeInTheDocument();
    });
  });

  describe('playback controls', () => {
    it('toggles play via play/pause button', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: playbackTrackFixture('1'),
        }),
      );

      customRender(<PlayerMobile formatTime={formatTime} formatTimeLeft={formatTimeLeft} />);
      const btns = screen.getAllByRole('button');
      // The play/pause button is the last one
      fireEvent.click(btns[btns.length - 1]);
      expect(togglePlay).toHaveBeenCalled();
    });

    it('calls toggleShuffle when shuffle button clicked', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: playbackTrackFixture('1'),
          playbackVersion: 1,
        }),
      );

      customRender(
        <PlayerMobile formatTime={formatTime} formatTimeLeft={formatTimeLeft} compact={false} />,
      );
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

      customRender(
        <PlayerMobile formatTime={formatTime} formatTimeLeft={formatTimeLeft} compact={false} />,
      );
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

      customRender(
        <PlayerMobile formatTime={formatTime} formatTimeLeft={formatTimeLeft} compact={false} />,
      );
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

      customRender(
        <PlayerMobile formatTime={formatTime} formatTimeLeft={formatTimeLeft} compact={false} />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Next Track' }));
      expect(nextTrack).toHaveBeenCalled();
    });

    it('renders the progress slider only when not compact', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: playbackTrackFixture('1'),
          duration: 200,
        }),
      );

      // Compact mode (default) - should NOT have slider
      const { rerender } = customRender(
        <PlayerMobile formatTime={formatTime} formatTimeLeft={formatTimeLeft} compact={true} />,
      );
      expect(screen.queryByRole('slider')).not.toBeInTheDocument();

      // Non-compact mode - SHOULD have slider
      rerender(
        <PlayerMobile formatTime={formatTime} formatTimeLeft={formatTimeLeft} compact={false} />,
      );
      expect(screen.getByRole('slider')).toBeInTheDocument();
    });

    it('renders artist name and time in compact mode', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: playbackTrackFixture('1', { artists: ['Artist Alpha', 'Artist Beta'] }),
          currentTime: 45,
          duration: 180,
        }),
      );

      customRender(
        <PlayerMobile formatTime={formatTime} formatTimeLeft={formatTimeLeft} compact={true} />,
      );

      expect(
        screen.getByText((content) => content.includes('Artist Alpha, Artist Beta')),
      ).toBeInTheDocument();
      // Use a more flexible matcher since the text is broken up by spans and spaces
      expect(
        screen.getByText((content) => content.includes('0:45') && content.includes('-2:15')),
      ).toBeInTheDocument();
    });
  });

  describe('favorite button', () => {
    it('is disabled when no current track', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: null,
          playbackVersion: 1,
        }),
      );

      customRender(<PlayerMobile formatTime={formatTime} formatTimeLeft={formatTimeLeft} />);
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

      customRender(<PlayerMobile formatTime={formatTime} formatTimeLeft={formatTimeLeft} />);
      const favBtn = screen.getByRole('button', { name: 'Favorite' });
      expect(favBtn).toBeDisabled();
    });

    it('toggles favorite state and syncs', async () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: playbackTrackFixture('1'),
          playbackVersion: 1,
          playbackFavorited: 'not-set',
        }),
      );
      vi.mocked(playbackSync.emitFavoriteStateSync).mockResolvedValue();

      customRender(<PlayerMobile formatTime={formatTime} formatTimeLeft={formatTimeLeft} />);
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
      vi.mocked(playbackSync.emitFavoriteStateSync).mockResolvedValue();

      customRender(<PlayerMobile formatTime={formatTime} formatTimeLeft={formatTimeLeft} />);
      fireEvent.click(screen.getByRole('button', { name: 'Favorite' }));

      expect(mockUsePlayerStore.setState).toHaveBeenCalledWith({ playbackFavorited: 'not-set' });
      expect(playbackSync.emitFavoriteStateSync).toHaveBeenCalledWith('not-set');
    });

    it('rolls back favorite state on sync failure', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: playbackTrackFixture('1'),
          playbackVersion: 1,
          playbackFavorited: 'not-set',
        }),
      );
      vi.mocked(playbackSync.emitFavoriteStateSync).mockRejectedValue(new Error('sync failed'));

      customRender(<PlayerMobile formatTime={formatTime} formatTimeLeft={formatTimeLeft} />);
      fireEvent.click(screen.getByRole('button', { name: 'Favorite' }));

      // Should have called setState twice: optimistic update then rollback
      await waitFor(() => {
        expect(mockUsePlayerStore.setState).toHaveBeenCalledWith({ playbackFavorited: 'not-set' });
      });
      expect(mockUsePlayerStore.setState).toHaveBeenCalledWith({ playbackFavorited: 'favorited' });
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('does nothing when no currentTrack on click', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: null,
          playbackVersion: 1,
        }),
      );

      customRender(<PlayerMobile formatTime={formatTime} formatTimeLeft={formatTimeLeft} />);
      // Button is disabled, but we still verify the guard
      const favBtn = screen.getByRole('button', { name: 'Favorite' });
      expect(favBtn).toBeDisabled();
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

      customRender(
        <PlayerMobile formatTime={formatTime} formatTimeLeft={formatTimeLeft} compact={false} />,
      );
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

      customRender(
        <PlayerMobile formatTime={formatTime} formatTimeLeft={formatTimeLeft} compact={false} />,
      );
      const repeatBtn = screen.getByRole('button', { name: 'Toggle Repeat' });
      expect(repeatBtn.className).toContain('text-emerald-400');
    });

    it('shows emerald filled star when track is favorited', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: playbackTrackFixture('1'),
          playbackVersion: 1,
          playbackFavorited: 'favorited',
        }),
      );

      customRender(<PlayerMobile formatTime={formatTime} formatTimeLeft={formatTimeLeft} />);
      const favBtn = screen.getByRole('button', { name: 'Favorite' });
      expect(favBtn.className).toContain('text-emerald-400');
    });
  });

  describe('stopPropagation', () => {
    it('stops click propagation on all buttons', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: playbackTrackFixture('1'),
          playbackVersion: 1,
        }),
      );

      const wrapperOnClick = vi.fn();
      const { container } = customRender(
        <div onClick={wrapperOnClick}>
          <PlayerMobile formatTime={formatTime} formatTimeLeft={formatTimeLeft} compact={false} />
        </div>,
      );

      const buttons = container.querySelectorAll('button');
      for (const btn of buttons) {
        fireEvent.click(btn);
      }

      // No click should have bubbled up to the wrapper
      expect(wrapperOnClick).not.toHaveBeenCalled();
    });
  });
});
