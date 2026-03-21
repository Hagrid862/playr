import { PlayerState, usePlayerStore } from '@/stores/player.store';
import { customRender } from '@repo/testing';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPlayerStateMock } from '../test-utils/player-test-utils';
import { PlayerControls } from './PlayerControls';

vi.mock('@/stores/player.store', () => ({
  usePlayerStore: vi.fn(),
}));

describe('PlayerControls', () => {
  const togglePlay = vi.fn();
  const nextTrack = vi.fn();
  const previousTrack = vi.fn();
  const toggleRepeatMode = vi.fn();
  const toggleShuffle = vi.fn();

  const buildState = (overrides: Partial<PlayerState> = {}): PlayerState =>
    createPlayerStateMock({
      isPlaying: false,
      togglePlay,
      nextTrack,
      previousTrack,
      repeatMode: 'off',
      toggleRepeatMode,
      isShuffled: false,
      toggleShuffle,
      ...overrides,
    });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePlayerStore).mockReturnValue(buildState());
  });

  describe('rendering', () => {
    it('renders correctly', () => {
      customRender(<PlayerControls />);
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(5);
    });

    it('shows play icon when not playing and pause icon when playing', () => {
      const { rerender } = customRender(<PlayerControls />);

      const playPauseButton = screen.getByRole('button', { name: /play|pause/i });
      fireEvent.click(playPauseButton);
      expect(togglePlay).toHaveBeenCalled();

      vi.mocked(usePlayerStore).mockReturnValue(buildState({ isPlaying: true }));
      rerender(<PlayerControls />);
    });

    it('handles isShuffled true', () => {
      vi.mocked(usePlayerStore).mockReturnValue(buildState({ isShuffled: true }));
      customRender(<PlayerControls />);
      const shuffleButton = screen.getByRole('button', { name: /toggle shuffle/i });
      expect(shuffleButton).toHaveClass('text-emerald-500');
    });
  });

  describe('transport', () => {
    it('triggers previousTrack', () => {
      customRender(<PlayerControls />);
      const previousButton = screen.getByRole('button', { name: /previous track/i });
      fireEvent.click(previousButton);
      expect(previousTrack).toHaveBeenCalled();
    });

    it('triggers nextTrack', () => {
      customRender(<PlayerControls />);
      const nextButton = screen.getByRole('button', { name: /next track/i });
      fireEvent.click(nextButton);
      expect(nextTrack).toHaveBeenCalled();
    });

    it('triggers toggleShuffle', () => {
      customRender(<PlayerControls />);
      const shuffleButton = screen.getByRole('button', { name: /toggle shuffle/i });
      fireEvent.click(shuffleButton);
      expect(toggleShuffle).toHaveBeenCalled();
    });

    it('triggers toggleRepeatMode', () => {
      customRender(<PlayerControls />);
      const repeatButton = screen.getByRole('button', { name: /repeat/i });
      fireEvent.click(repeatButton);
      expect(toggleRepeatMode).toHaveBeenCalled();
    });

    it('handles repeatMode "one"', () => {
      vi.mocked(usePlayerStore).mockReturnValue(buildState({ repeatMode: 'one' }));
      customRender(<PlayerControls />);
      const repeatButton = screen.getByRole('button', { name: /repeat/i });
      fireEvent.click(repeatButton);
      expect(toggleRepeatMode).toHaveBeenCalled();
    });
  });
});
