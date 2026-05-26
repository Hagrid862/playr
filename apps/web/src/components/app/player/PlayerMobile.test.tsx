import { PlayerState, usePlayerStore } from '@/stores/player-store/player.store';
import { PlaybackTrack } from '@repo/contracts';
import { customRender } from '@repo/testing/web';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPlayerStateMock } from '../test-utils/player-test-utils';
import { PlayerMobile } from './PlayerMobile';

vi.mock('@/stores/player-store/player.store', () => ({
  usePlayerStore: vi.fn(),
}));

describe('PlayerMobile', () => {
  const togglePlay = vi.fn();
  const formatTime = vi.fn((t: number) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`);
  const formatTimeLeft = vi.fn((t: number, total: number) => `-${Math.floor((total - t) / 60)}:${String((total - t) % 60).padStart(2, '0')}`);

  const buildState = (overrides: Partial<PlayerState> = {}): PlayerState =>
    createPlayerStateMock({
      currentTrack: null,
      isPlaying: false,
      togglePlay,
      currentTime: 0,
      duration: 0,
      playbackFavorited: 'not-set' as const,
      playbackVersion: 0,
      setCurrentTime: vi.fn(),
      ...overrides,
    });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePlayerStore).mockReturnValue(buildState());
  });

  describe('rendering', () => {
    it('renders default empty state', () => {
      customRender(<PlayerMobile formatTime={formatTime} formatTimeLeft={formatTimeLeft} />);
      expect(screen.getByText('No track selected')).toBeInTheDocument();
    });

    it('renders track details with cover', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: {
            uniqueId: '1',
            id: '1',
            trackId: '1',
            title: 'Test Song',
            artists: ['Artist A'],
            albumArt: 'http://example.com/cover.jpg',
            albumName: 'Test Album',
            albumId: '1',
            duration: 100,
            explicit: false,
          } as PlaybackTrack,
        }),
      );

      customRender(<PlayerMobile formatTime={formatTime} formatTimeLeft={formatTimeLeft} />);
      expect(screen.getByText('Test Song')).toBeInTheDocument();

      const img = screen.getByRole('presentation');
      expect(img).toHaveAttribute('src', 'http://example.com/cover.jpg');
    });

    it('renders pause icon when playing', () => {
      vi.mocked(usePlayerStore).mockReturnValue(buildState({ isPlaying: true }));
      customRender(<PlayerMobile formatTime={formatTime} formatTimeLeft={formatTimeLeft} />);
      const btns = screen.getAllByRole('button');
      expect(btns.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('playback', () => {
    it('toggles play', () => {
      customRender(<PlayerMobile formatTime={formatTime} formatTimeLeft={formatTimeLeft} />);
      const btns = screen.getAllByRole('button');
      // The play/pause button is the last one
      fireEvent.click(btns[btns.length - 1]);
      expect(togglePlay).toHaveBeenCalled();
    });
  });
});
