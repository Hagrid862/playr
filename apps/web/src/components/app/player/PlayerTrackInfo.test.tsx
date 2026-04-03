import { PlayerState, usePlayerStore } from '@/stores/player.store';
import { StreamAudioQuality } from '@repo/contracts';
import { albumBuilder, artistBuilder, imageBuilder, trackBuilder } from '@repo/testing/builders';
import { customRender } from '@repo/testing/web';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPlayerStateMock } from '../test-utils/player-test-utils';
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
      <PlayerTrackInfo formatTime={formatTime} formatTimeLeft={formatTimeLeft} onSeek={onSeek} />,
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
            uniqueId: '1',
            ...trackBuilder({ title: 'Test Song' }),
            artists: [artistBuilder({ name: 'Artist A' })],
            album: {
              ...albumBuilder({ name: 'Album A' }),
              cover: imageBuilder({ url: 'http://example.com/cover.jpg' }),
            },
          },
        }),
      );

      renderTrackInfo();
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
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          quality: StreamAudioQuality.lossless,
          currentTrack: {
            uniqueId: '1',
            ...trackBuilder({ title: 'Lossless Song' }),
            artists: [artistBuilder({ name: 'Artist A' })],
            album: {
              ...albumBuilder({ name: 'Album A' }),
              cover: imageBuilder({ url: 'http://example.com/cover.jpg' }),
            },
          },
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
            uniqueId: '2',
            ...trackBuilder({ title: 'Zero Duration Song' }),
            artists: [artistBuilder({ name: 'Artist A' })],
            album: {
              ...albumBuilder({ name: 'Album A' }),
              cover: imageBuilder({ url: 'http://example.com/cover.jpg' }),
            },
          },
        }),
      );

      renderTrackInfo();
      expect(screen.getByText('Zero Duration Song')).toBeInTheDocument();
    });
  });
});
