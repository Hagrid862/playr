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
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[2]); // togglePlay button
    expect(togglePlay).toHaveBeenCalled();

    // Now playing
    vi.mocked(usePlayerStore).mockReturnValue({ ...defaultStore, isPlaying: true } as PlayerState);
    rerender(<PlayerControls />);
  });

  it('triggers previousTrack', () => {
    render(<PlayerControls />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]);
    expect(previousTrack).toHaveBeenCalled();
  });

  it('triggers nextTrack', () => {
    render(<PlayerControls />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[3]);
    expect(nextTrack).toHaveBeenCalled();
  });

  it('triggers toggleShuffle', () => {
    render(<PlayerControls />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(toggleShuffle).toHaveBeenCalled();
  });

  it('triggers toggleRepeatMode', () => {
    render(<PlayerControls />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[4]);
    expect(toggleRepeatMode).toHaveBeenCalled();
  });

  it('handles repeatMode "one"', () => {
    vi.mocked(usePlayerStore).mockReturnValue({
      ...defaultStore,
      repeatMode: 'one',
    } as PlayerState);
    render(<PlayerControls />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[4]);
    expect(toggleRepeatMode).toHaveBeenCalled();
  });

  it('handles isShuffled true', () => {
    vi.mocked(usePlayerStore).mockReturnValue({ ...defaultStore, isShuffled: true } as PlayerState);
    render(<PlayerControls />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveClass('text-emerald-500');
  });
});
