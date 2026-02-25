import { PlayerState, usePlayerStore } from '@/stores/player.store';
import { StreamAudioQuality } from '@repo/contracts';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayerTrackInfo } from './PlayerTrackInfo';

vi.mock('@/stores/player.store', () => ({
  usePlayerStore: vi.fn(),
}));

vi.mock('@/components/ui/slider', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Slider: ({ value, onChange, onMouseEnter, onMouseLeave, onPointerDown, onPointerUp }: any) => (
    <button
      type="button"
      data-testid="mock-slider"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onClick={() => onChange(50)}
    >
      slider value: {value}
    </button>
  ),
}));

describe('PlayerTrackInfo', () => {
  const setCurrentTime = vi.fn();
  const formatTime = vi.fn((t) => `time:${t}`);
  const formatTimeLeft = vi.fn((t, d) => `left:${d - t}`);
  const onSeek = vi.fn();

  const defaultStore: Partial<PlayerState> = {
    currentTrack: null,
    currentTime: 10,
    duration: 100,
    setCurrentTime,
    quality: StreamAudioQuality.high,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePlayerStore).mockReturnValue(defaultStore as PlayerState);
  });

  it('renders default empty state', () => {
    render(
      <PlayerTrackInfo formatTime={formatTime} formatTimeLeft={formatTimeLeft} onSeek={onSeek} />,
    );
    expect(screen.getByText('No track selected')).toBeInTheDocument();
    expect(screen.getByText('Unknown Artist')).toBeInTheDocument();
    expect(screen.getByText('time:10')).toBeInTheDocument();
  });

  it('renders track details and interactions', () => {
    vi.mocked(usePlayerStore).mockReturnValue({
      ...defaultStore,
      currentTrack: {
        uniqueId: '1',
        title: 'Test Song',
        artists: [{ name: 'Artist A' }],
        album: { cover: { url: 'http://example.com/cover.jpg' } },
      } as unknown as PlayerState['currentTrack'],
    } as PlayerState);

    render(
      <PlayerTrackInfo formatTime={formatTime} formatTimeLeft={formatTimeLeft} onSeek={onSeek} />,
    );
    expect(screen.getByText('Test Song')).toBeInTheDocument();

    const slider = screen.getByTestId('mock-slider');
    expect(screen.getByText('Artist A')).toBeInTheDocument();

    fireEvent.pointerDown(slider);
    fireEvent.pointerUp(slider);
    fireEvent.mouseEnter(slider);
    fireEvent.mouseLeave(slider);

    fireEvent.click(slider);
    expect(onSeek).toHaveBeenCalledWith(50);
    expect(setCurrentTime).toHaveBeenCalledWith(50);
  });

  it('renders lossless badge when quality is lossless', () => {
    vi.mocked(usePlayerStore).mockReturnValue({
      ...defaultStore,
      quality: StreamAudioQuality.lossless,
      currentTrack: {
        uniqueId: '1',
        title: 'Lossless Song',
        artists: [],
        album: {},
      } as unknown as PlayerState['currentTrack'],
    } as PlayerState);

    render(
      <PlayerTrackInfo formatTime={formatTime} formatTimeLeft={formatTimeLeft} onSeek={onSeek} />,
    );
    expect(screen.getByText('Lossless Song')).toBeInTheDocument();
  });

  it('renders correctly when duration is zero', () => {
    vi.mocked(usePlayerStore).mockReturnValue({
      ...defaultStore,
      duration: 0,
      currentTrack: {
        uniqueId: '2',
        title: 'Zero Duration Song',
        artists: [],
        album: {},
      } as unknown as PlayerState['currentTrack'],
    } as PlayerState);

    render(
      <PlayerTrackInfo formatTime={formatTime} formatTimeLeft={formatTimeLeft} onSeek={onSeek} />,
    );
    expect(screen.getByText('Zero Duration Song')).toBeInTheDocument();
  });
});
