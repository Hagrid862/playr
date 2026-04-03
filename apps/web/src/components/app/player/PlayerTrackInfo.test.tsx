import { PlayerState, usePlayerStore } from '@/stores/player-store/player.store';
import { PlaybackTrack, StreamAudioQuality } from '@repo/contracts';
import { customRender } from '@repo/testing/web';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPlayerStateMock } from '../test-utils/player-test-utils';
import { PlayerTrackInfo } from './PlayerTrackInfo';

vi.mock('@/stores/player-store/player.store', () => ({
  usePlayerStore: vi.fn(),
}));

vi.mock('@/components/ui/slider', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Slider: ({ value, onChange, onMouseEnter, onMouseLeave, onPointerDown, onPointerUp }: any) => (
    <div data-testid="mock-slider-container">
      <button
        type="button"
        data-testid="mock-slider"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onClick={() => {
          onChange(50);
          onPointerUp?.();
        }}
      >
        slider value: {value}
      </button>
      <button type="button" data-testid="mock-slider-up" onClick={() => onPointerUp?.()}>
        Just Up
      </button>
    </div>
  ),
}));

describe('PlayerTrackInfo', () => {
  const setCurrentTime = vi.fn();
  const formatTime = vi.fn((t) => `time:${t}`);
  const formatTimeLeft = vi.fn((t, d) => `left:${d - t}`);
  const onSeek = vi.fn();
  const onSeekCommit = vi.fn();

  const buildState = (overrides: Partial<PlayerState> = {}): PlayerState =>
    createPlayerStateMock({
      currentTrack: null,
      currentTime: 10,
      duration: 100,
      setCurrentTime,
      quality: StreamAudioQuality.high,
      ...overrides,
    });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePlayerStore).mockReturnValue(buildState());
  });

  const renderTrackInfo = () =>
    customRender(
      <PlayerTrackInfo
        formatTime={formatTime}
        formatTimeLeft={formatTimeLeft}
        onSeek={onSeek}
        onSeekCommit={onSeekCommit}
      />,
    );

  describe('empty state', () => {
    it('renders default empty state', () => {
      renderTrackInfo();
      expect(screen.getByText('No track selected')).toBeInTheDocument();
      expect(screen.getByText('Unknown Artist')).toBeInTheDocument();
      expect(screen.getByText('time:10')).toBeInTheDocument();
    });
  });

  describe('track details', () => {
    it('renders track details and interactions', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          currentTrack: {
            id: '1',
            trackId: '1',
            title: 'Test Song',
            artists: ['Artist A'],
            albumName: 'Album A',
            albumId: '1',
            albumArt: 'http://example.com/cover.jpg',
            duration: 100,
            explicit: false,
          } as PlaybackTrack,
        }),
      );

      renderTrackInfo();
      expect(screen.getByText('Test Song')).toBeInTheDocument();

      const slider = screen.getByTestId('mock-slider');
      expect(screen.getByText('Artist A')).toBeInTheDocument();

      fireEvent.pointerDown(slider);
      fireEvent.mouseEnter(slider);
      fireEvent.mouseLeave(slider);

      fireEvent.click(slider);
      expect(onSeek).toHaveBeenCalledWith(50);
      expect(onSeekCommit).toHaveBeenCalledWith(50);
      expect(setCurrentTime).toHaveBeenCalledWith(50);
    });

    it('renders lossless badge when quality is lossless', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          quality: StreamAudioQuality.lossless,
          currentTrack: {
            id: '1',
            title: 'Lossless Song',
            trackId: '1',
            artists: ['Artist A'],
            albumName: 'Album A',
            albumId: '1',
            albumArt: 'http://example.com/cover.jpg',
            duration: 100,
            explicit: false,
          } as PlaybackTrack,
        }),
      );

      renderTrackInfo();
      expect(screen.getByText('Lossless Song')).toBeInTheDocument();
      expect(screen.getByLabelText('Lossless quality')).toBeInTheDocument();
    });

    it('renders correctly when duration is zero', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          duration: 0,
          currentTrack: {
            id: '2',
            title: 'Zero Duration Song',
            trackId: '2',
            artists: ['Artist A'],
            albumName: 'Album A',
            albumId: '1',
            albumArt: 'http://example.com/cover.jpg',
            duration: 0,
            explicit: false,
          } as PlaybackTrack,
        }),
      );

      renderTrackInfo();
      expect(screen.getByText('Zero Duration Song')).toBeInTheDocument();
    });

    it('handles pointer up without change', () => {
      renderTrackInfo();
      const upBtn = screen.getByTestId('mock-slider-up');
      fireEvent.click(upBtn);
      expect(onSeekCommit).toHaveBeenCalledWith(10); // current time is 10
    });
  });
});
