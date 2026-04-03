import { useIsMobile } from '@/hooks/use-mobile';
import { emitCurrentTimeSync, isPlaybackSyncConnected } from '@/lib/playback/sync/playback-sync';
import { usePlayerStore } from '@/stores/player-store/player.store';
import type { PlaybackTrack } from '@repo/contracts';
import { customRender } from '@repo/testing/web';
import { fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppPlayer } from './Player';
import { usePlayerAudio } from './player/use-player-audio';
import { createPlayerStateMock } from './test-utils/player-test-utils';

function playbackTrackStub(id: string): PlaybackTrack {
  return {
    id,
    title: 'T',
    trackId: id,
    artists: [],
    albumName: 'A',
    albumId: 'aid',
    albumArt: null,
    duration: 0,
    explicit: false,
  };
}

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(),
}));

vi.mock('@/lib/playback/sync/playback-sync', () => ({
  emitCurrentTimeSync: vi.fn(),
  isPlaybackSyncConnected: vi.fn(),
}));

vi.mock('@/stores/player-store/player.store', () => ({
  usePlayerStore: vi.fn(),
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
  PlayerTrackInfo: ({
    onSeek,
    onSeekCommit,
  }: {
    onSeek: (time: number) => void;
    onSeekCommit: (time: number) => void;
  }) => (
    <div data-testid="player-track-info">
      <button type="button" onClick={() => onSeek(42)}>
        Seek
      </button>
      <button type="button" onClick={() => onSeekCommit(42)}>
        Commit Seek
      </button>
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
    vi.mocked(usePlayerStore).mockReturnValue(
      createPlayerStateMock({
        currentTrack: playbackTrackStub('track-1'),
        playbackVersion: 1,
      }),
    );
    vi.mocked(isPlaybackSyncConnected).mockReturnValue(true);
  });

  describe('layout', () => {
    it('renders mobile version when isMobile is true', () => {
      vi.mocked(useIsMobile).mockReturnValue(true);
      customRender(<AppPlayer />);
      expect(screen.getByTestId('player-mobile')).toBeInTheDocument();
      expect(screen.queryByTestId('player-controls')).not.toBeInTheDocument();
    });

    it('renders desktop version when isMobile is false', () => {
      vi.mocked(useIsMobile).mockReturnValue(false);
      customRender(<AppPlayer />);
      expect(screen.getByTestId('player-controls')).toBeInTheDocument();
      expect(screen.getByTestId('player-track-info')).toBeInTheDocument();
      expect(screen.getByTestId('player-actions')).toBeInTheDocument();
      expect(screen.queryByTestId('player-mobile')).not.toBeInTheDocument();
    });
  });

  describe('seek', () => {
    it('handles seek and updates audio currentTime', () => {
      vi.mocked(useIsMobile).mockReturnValue(false);
      customRender(<AppPlayer />);
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
            // Prevent React from assigning the mounted audio element
          },
        } as React.RefObject<HTMLAudioElement>,
      };
      vi.mocked(usePlayerAudio).mockReturnValue(nullRefMock);
      customRender(<AppPlayer />);

      expect(() => {
        fireEvent.click(screen.getByText('Seek'));
      }).not.toThrow();
    });

    it('emits sync on seek commit when connected', () => {
      vi.mocked(useIsMobile).mockReturnValue(false);
      customRender(<AppPlayer />);
      fireEvent.click(screen.getByText('Commit Seek'));
      expect(emitCurrentTimeSync).toHaveBeenCalledWith(42);
    });

    it('does not emit sync on seek commit when disconnected', () => {
      vi.mocked(isPlaybackSyncConnected).mockReturnValue(false);
      vi.mocked(useIsMobile).mockReturnValue(false);
      customRender(<AppPlayer />);
      fireEvent.click(screen.getByText('Commit Seek'));
      expect(emitCurrentTimeSync).not.toHaveBeenCalled();
    });

    it('does not emit sync on seek commit when missing currentTrack', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        createPlayerStateMock({ currentTrack: null, playbackVersion: 1 }),
      );
      vi.mocked(useIsMobile).mockReturnValue(false);
      customRender(<AppPlayer />);
      fireEvent.click(screen.getByText('Commit Seek'));
      expect(emitCurrentTimeSync).not.toHaveBeenCalled();
    });

    it('does not emit sync on seek commit when playbackVersion is 0', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        createPlayerStateMock({
          currentTrack: playbackTrackStub('t1'),
          playbackVersion: 0,
        }),
      );
      vi.mocked(useIsMobile).mockReturnValue(false);
      customRender(<AppPlayer />);
      fireEvent.click(screen.getByText('Commit Seek'));
      expect(emitCurrentTimeSync).not.toHaveBeenCalled();
    });
  });

  describe('audio element', () => {
    it('passes handlers to audio element', () => {
      vi.mocked(useIsMobile).mockReturnValue(false);
      const { container } = customRender(<AppPlayer />);
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
});
