import { useIsMobile } from '@/hooks/use-mobile';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppPlayer } from './Player';
import { usePlayerAudio } from './player/use-player-audio';

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(),
}));

vi.mock('./player/use-player-audio', () => ({
  usePlayerAudio: vi.fn(),
}));

vi.mock('./player/PlayerActions', () => ({
  PlayerActions: () => <div data-testid="player-actions" />,
}));
vi.mock('./player/PlayerControls', () => ({
  PlayerControls: () => <div data-testid="player-controls" />,
}));
vi.mock('./player/PlayerMobile', () => ({
  PlayerMobile: () => <div data-testid="player-mobile" />,
}));
vi.mock('./player/PlayerTrackInfo', () => ({
  PlayerTrackInfo: ({ onSeek }: { onSeek: (time: number) => void }) => (
    <div data-testid="player-track-info">
      <button onClick={() => onSeek(42)}>Seek</button>
    </div>
  ),
}));

describe('AppPlayer', () => {
  const mockAudioRef = { current: { currentTime: 0 } as HTMLAudioElement };
  const mockUsePlayerAudio = {
    audioRef: mockAudioRef,
    handleTimeUpdate: vi.fn(),
    handleLoadedMetadata: vi.fn(),
    handleTrackEnd: vi.fn(),
    getAudioUrl: vi.fn().mockReturnValue('audio-url.mp3'),
    formatTime: vi.fn(),
    formatTimeLeft: vi.fn(),
    nextTrack: vi.fn(),
  } as ReturnType<typeof usePlayerAudio>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePlayerAudio).mockReturnValue(mockUsePlayerAudio);
  });

  it('renders mobile version when isMobile is true', () => {
    vi.mocked(useIsMobile).mockReturnValue(true);
    render(<AppPlayer />);
    expect(screen.getByTestId('player-mobile')).toBeInTheDocument();
    expect(screen.queryByTestId('player-controls')).not.toBeInTheDocument();
  });

  it('renders desktop version when isMobile is false', () => {
    vi.mocked(useIsMobile).mockReturnValue(false);
    render(<AppPlayer />);
    expect(screen.getByTestId('player-controls')).toBeInTheDocument();
    expect(screen.getByTestId('player-track-info')).toBeInTheDocument();
    expect(screen.getByTestId('player-actions')).toBeInTheDocument();
    expect(screen.queryByTestId('player-mobile')).not.toBeInTheDocument();
  });

  it('handles seek and updates audio currentTime', () => {
    vi.mocked(useIsMobile).mockReturnValue(false);
    render(<AppPlayer />);
    fireEvent.click(screen.getByText('Seek'));
    expect(mockAudioRef.current.currentTime).toBe(42);
  });

  it('handles seek when audioRef is null', () => {
    vi.mocked(useIsMobile).mockReturnValue(false);
    const nullRefMock: ReturnType<typeof usePlayerAudio> = {
      ...mockUsePlayerAudio,
      audioRef: {
        get current() {
          return null;
        },
        set current(_val: HTMLAudioElement | null) {
          // Do nothing to prevent React from assigning the mounted audio element
        },
      } as React.RefObject<HTMLAudioElement>,
    };
    vi.mocked(usePlayerAudio).mockReturnValue(nullRefMock);
    render(<AppPlayer />);

    // Should not throw
    expect(() => {
      fireEvent.click(screen.getByText('Seek'));
    }).not.toThrow();
  });

  it('passes handlers to audio element', () => {
    vi.mocked(useIsMobile).mockReturnValue(false);
    const { container } = render(<AppPlayer />);
    const audioEl = container.querySelector('audio');

    expect(audioEl).toHaveAttribute('src', 'audio-url.mp3');
    expect(audioEl).toHaveAttribute('crossOrigin', 'anonymous');

    if (audioEl) {
      fireEvent.timeUpdate(audioEl);
      expect(mockUsePlayerAudio.handleTimeUpdate).toHaveBeenCalled();

      fireEvent.loadedMetadata(audioEl);
      expect(mockUsePlayerAudio.handleLoadedMetadata).toHaveBeenCalled();

      fireEvent.ended(audioEl);
      expect(mockUsePlayerAudio.handleTrackEnd).toHaveBeenCalled();
    }
  });
});
