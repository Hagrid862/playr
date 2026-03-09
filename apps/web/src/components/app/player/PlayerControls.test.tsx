import { PlayerState, usePlayerStore } from '@/stores/player.store';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

  const defaultStore: Partial<PlayerState> = {
    isPlaying: false,
    togglePlay,
    nextTrack,
    previousTrack,
    repeatMode: 'off',
    toggleRepeatMode,
    isShuffled: false,
    toggleShuffle,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePlayerStore).mockReturnValue(defaultStore as PlayerState);
  });

  it('renders correctly', () => {
    render(<PlayerControls />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(5);
  });

  it('shows play icon when not playing and pause icon when playing', () => {
    const { rerender } = render(<PlayerControls />);

    // Not playing
    const playPauseButton = screen.getByRole('button', { name: /play|pause/i });
    fireEvent.click(playPauseButton);
    expect(togglePlay).toHaveBeenCalled();

    // Now playing
    vi.mocked(usePlayerStore).mockReturnValue({ ...defaultStore, isPlaying: true } as PlayerState);
    rerender(<PlayerControls />);
  });

  it('triggers previousTrack', () => {
    render(<PlayerControls />);
    const previousButton = screen.getByRole('button', { name: /previous track/i });
    fireEvent.click(previousButton);
    expect(previousTrack).toHaveBeenCalled();
  });

  it('triggers nextTrack', () => {
    render(<PlayerControls />);
    const nextButton = screen.getByRole('button', { name: /next track/i });
    fireEvent.click(nextButton);
    expect(nextTrack).toHaveBeenCalled();
  });

  it('triggers toggleShuffle', () => {
    render(<PlayerControls />);
    const shuffleButton = screen.getByRole('button', { name: /toggle shuffle/i });
    fireEvent.click(shuffleButton);
    expect(toggleShuffle).toHaveBeenCalled();
  });

  it('triggers toggleRepeatMode', () => {
    render(<PlayerControls />);
    const repeatButton = screen.getByRole('button', { name: /repeat/i });
    fireEvent.click(repeatButton);
    expect(toggleRepeatMode).toHaveBeenCalled();
  });

  it('handles repeatMode "one"', () => {
    vi.mocked(usePlayerStore).mockReturnValue({
      ...defaultStore,
      repeatMode: 'one',
    } as PlayerState);
    render(<PlayerControls />);
    const repeatButton = screen.getByRole('button', { name: /repeat/i });
    fireEvent.click(repeatButton);
    expect(toggleRepeatMode).toHaveBeenCalled();
  });

  it('handles isShuffled true', () => {
    vi.mocked(usePlayerStore).mockReturnValue({ ...defaultStore, isShuffled: true } as PlayerState);
    render(<PlayerControls />);
    const shuffleButton = screen.getByRole('button', { name: /toggle shuffle/i });
    expect(shuffleButton).toHaveClass('text-emerald-500');
  });
});
