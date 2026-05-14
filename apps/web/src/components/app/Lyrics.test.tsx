import { usePlayerStore } from '@/stores/player.store';
import type { PlaybackTrack } from '@repo/contracts';
import { customRender } from '@repo/testing/web';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Lyrics } from './Lyrics';
import { createPlayerStateMock } from './test-utils/player-test-utils';

vi.mock('@/stores/player.store', () => ({
  usePlayerStore: vi.fn(),
}));

describe('Lyrics', () => {
  const mockToggleQueue = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('current track', () => {
    it('renders no track playing when currentTrack is null', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        createPlayerStateMock({
          currentTrack: null,
          toggleQueue: mockToggleQueue,
        }),
      );

      customRender(<Lyrics />);
      expect(screen.getByText('No track playing')).toBeInTheDocument();
    });

    it('renders track title and not available message when track is playing', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        createPlayerStateMock({
          currentTrack: {
            title: 'Test Song',
            trackId: '1',
            artists: ['Artist 1'],
            albumName: 'Album 1',
            albumId: '1',
            albumArt: 'cover.jpg',
            duration: 100,
            explicit: false,
          } as PlaybackTrack,
          toggleQueue: mockToggleQueue,
        }),
      );

      customRender(<Lyrics />);
      expect(screen.getByText('Test Song')).toBeInTheDocument();
      expect(screen.getByText('Lyrics not available yet.')).toBeInTheDocument();
    });
  });

  describe('close', () => {
    it('calls toggleQueue when close button is clicked', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        createPlayerStateMock({
          currentTrack: null,
          toggleQueue: mockToggleQueue,
        }),
      );

      customRender(<Lyrics />);
      const closeBtn = screen.getByRole('button');
      fireEvent.click(closeBtn);
      expect(mockToggleQueue).toHaveBeenCalled();
    });
  });
});
