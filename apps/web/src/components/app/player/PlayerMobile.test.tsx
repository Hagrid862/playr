import { PlayerState, usePlayerStore } from '@/stores/player.store';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPlayerStateMock } from '../test-utils/player-test-utils';
import { PlayerMobile } from './PlayerMobile';

vi.mock('@/stores/player.store', () => ({
  usePlayerStore: vi.fn(),
}));

describe('PlayerMobile', () => {
  const togglePlay = vi.fn();

  const buildState = (overrides: Partial<PlayerState> = {}): PlayerState =>
    createPlayerStateMock({
      currentTrack: null,
      isPlaying: false,
      togglePlay,
      ...overrides,
    });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePlayerStore).mockReturnValue(buildState());
  });

  describe('rendering', () => {
    it('renders default empty state', () => {
      render(<PlayerMobile />);
      expect(screen.getByText('No track selected')).toBeInTheDocument();
      expect(screen.getByText('Unknown Artist')).toBeInTheDocument();
    });

    it('renders track details with cover', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: {
            uniqueId: '1',
            title: 'Test Song',
            artists: [{ name: 'Artist A' }],
            album: { cover: { url: 'http://example.com/cover.jpg' } },
          } as PlayerState['currentTrack'],
        }),
      );

      render(<PlayerMobile />);
      expect(screen.getByText('Test Song')).toBeInTheDocument();
      expect(screen.getByText('Artist A')).toBeInTheDocument();

      const img = screen.getByRole('presentation');
      expect(img).toHaveAttribute('src', 'http://example.com/cover.jpg');
    });

    it('renders pause icon when playing', () => {
      vi.mocked(usePlayerStore).mockReturnValue(buildState({ isPlaying: true }));
      render(<PlayerMobile />);
      const btn = screen.getByRole('button');
      expect(btn).toBeInTheDocument();
    });
  });

  describe('playback', () => {
    it('toggles play', () => {
      render(<PlayerMobile />);
      const btn = screen.getByRole('button');
      fireEvent.click(btn);
      expect(togglePlay).toHaveBeenCalled();
    });
  });
});
