import { PlayerState, usePlayerStore } from '@/stores/player-store/player.store';
import { testQueueItem } from '@/test-utils/queue-test-fixtures';
import type { QueueItem } from '@repo/contracts';
import { customRender } from '@repo/testing/web';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { History } from './History';
import { createPlayerStateMock } from './test-utils/player-test-utils';

vi.mock('@/stores/player-store/player.store', () => ({
  usePlayerStore: vi.fn(),
}));

describe('History', () => {
  const mockPlayTrack = vi.fn();
  const mockToggleQueue = vi.fn();
  const mockOnBack = vi.fn();
  const buildState = (overrides: Partial<PlayerState> = {}) =>
    createPlayerStateMock({
      history: [],
      playTrack: mockPlayTrack,
      toggleQueue: mockToggleQueue,
      ...overrides,
    });
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePlayerStore).mockReturnValue(buildState());
  });

  describe('empty state', () => {
    it('renders empty state when history is empty', () => {
      customRender(<History isVisible={true} onBack={mockOnBack} />);
      expect(screen.getByText('No listening history')).toBeInTheDocument();
    });
  });

  describe('history list', () => {
    it('renders history tracks', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        createPlayerStateMock({
          history: [
            testQueueItem({
              queueId: '01900000-0000-7000-8000-000000000101',
              position: 0,
              originalPosition: 0,
              track: {
                id: '1',
                title: 'Track 1',
                trackId: '1',
                artists: ['Artist 1'],
                albumName: 'Album 1',
                albumId: '1',
                albumArt: 'cover.jpg',
                duration: 100,
                explicit: false,
              },
            }),
            testQueueItem({
              queueId: '01900000-0000-7000-8000-000000000102',
              position: 1,
              originalPosition: 1,
              track: {
                id: '2',
                title: 'Track 2',
                trackId: '2',
                artists: ['Artist 2'],
                albumName: 'Album 2',
                albumId: '2',
                albumArt: 'cover.jpg',
                duration: 100,
                explicit: false,
              },
            }),
          ],
          playTrack: mockPlayTrack,
          toggleQueue: mockToggleQueue,
        }),
      );

      customRender(<History isVisible={true} onBack={mockOnBack} />);
      expect(screen.getByText('Track 1')).toBeInTheDocument();
      expect(screen.getByText('Artist 1')).toBeInTheDocument();
      expect(screen.getByText('Track 2')).toBeInTheDocument();
      expect(screen.getByAltText('Track 2')).toHaveAttribute('src', 'cover.jpg');
    });

    it('calls playTrack when a track is clicked', () => {
      const track = testQueueItem({
        queueId: '01900000-0000-7000-8000-000000000103',
        track: {
          id: '1',
          title: 'Track 1',
          trackId: '1',
          artists: ['Artist 1'],
          albumName: 'Album 1',
          albumId: '1',
          albumArt: 'cover.jpg',
          duration: 100,
          explicit: false,
        },
      });
      vi.mocked(usePlayerStore).mockReturnValue(
        createPlayerStateMock({
          history: [track],
          playTrack: mockPlayTrack,
          toggleQueue: mockToggleQueue,
        }),
      );

      customRender(<History isVisible={true} onBack={mockOnBack} />);
      fireEvent.click(screen.getByText('Track 1'));
      expect(mockPlayTrack).toHaveBeenCalledWith(track.track);
    });

    it('uses Cover art as img alt when albumArt is set but title is empty', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        createPlayerStateMock({
          history: [
            testQueueItem({
              queueId: '01900000-0000-7000-8000-0000000000e1',
              track: {
                id: '1',
                title: '',
                trackId: '1',
                artists: ['Artist'],
                albumName: 'Album',
                albumId: 'album-1',
                albumArt: 'cover-only.jpg',
                duration: 100,
                explicit: false,
              },
            }),
          ],
          playTrack: mockPlayTrack,
          toggleQueue: mockToggleQueue,
        }),
      );

      customRender(<History isVisible={true} onBack={mockOnBack} />);
      expect(screen.getByAltText('Cover art')).toHaveAttribute('src', 'cover-only.jpg');
    });

    it('renders placeholder when albumArt is missing', () => {
      const track: QueueItem = testQueueItem({
        queueId: '01900000-0000-7000-8000-0000000000d1',
        track: {
          id: '1',
          title: 'No Art Track',
          trackId: '1',
          artists: ['Artist'],
          albumName: 'Album',
          albumId: 'album-1',
          albumArt: null,
          duration: 100,
          explicit: false,
        },
      });
      vi.mocked(usePlayerStore).mockReturnValue(
        createPlayerStateMock({
          history: [track],
          playTrack: mockPlayTrack,
          toggleQueue: mockToggleQueue,
        }),
      );

      customRender(<History isVisible={true} onBack={mockOnBack} />);
      expect(screen.getByText('No Art Track')).toBeInTheDocument();
      // Should find the placeholder icon container
      const icon = document.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('handles load more functionality', () => {
      const history: QueueItem[] = Array.from({ length: 25 }).map((_, i) =>
        testQueueItem({
          queueId: `01900000-0000-7000-8000-${i.toString(16).padStart(12, '0')}`,
          position: i,
          originalPosition: i,
          track: {
            id: `track-${i}`,
            title: `Track ${i}`,
            trackId: `track-${i}`,
            artists: ['Artist'],
            albumName: `Album ${i}`,
            albumId: `album-${i}`,
            albumArt: `cover-${i}.jpg`,
            duration: 100,
            explicit: false,
          },
        }),
      );

      vi.mocked(usePlayerStore).mockReturnValue(
        createPlayerStateMock({
          history,
          playTrack: mockPlayTrack,
          toggleQueue: mockToggleQueue,
        }),
      );

      customRender(<History isVisible={true} onBack={mockOnBack} />);

      expect(screen.getByText('Track 0')).toBeInTheDocument();
      expect(screen.getByText('Track 19')).toBeInTheDocument();
      expect(screen.queryByText('Track 20')).not.toBeInTheDocument();

      const loadMoreBtn = screen.getByText('Load more');
      expect(loadMoreBtn).toBeInTheDocument();

      fireEvent.click(loadMoreBtn);

      expect(screen.getByText('Track 20')).toBeInTheDocument();
      expect(screen.getByText('Track 24')).toBeInTheDocument();
      expect(screen.queryByText('Load more')).not.toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('calls onBack when back button is clicked', () => {
      customRender(<History isVisible={true} onBack={mockOnBack} />);
      fireEvent.click(screen.getByTitle('Back to Queue'));
      expect(mockOnBack).toHaveBeenCalled();
    });

    it('calls toggleQueue when close button is clicked', () => {
      customRender(<History isVisible={true} onBack={mockOnBack} />);
      fireEvent.click(
        screen.getByRole('button', {
          name: /close/i,
        }),
      );
      expect(mockToggleQueue).toHaveBeenCalled();
    });
  });

  describe('visibility', () => {
    it('applies correct classes based on isVisible', () => {
      const { container, rerender } = customRender(
        <History isVisible={true} onBack={mockOnBack} />,
      );
      expect(container.firstChild).toHaveClass('opacity-100');
      expect(container.firstChild).not.toHaveClass('opacity-0');

      rerender(<History isVisible={false} onBack={mockOnBack} />);
      expect(container.firstChild).toHaveClass('opacity-0');
      expect(container.firstChild).not.toHaveClass('opacity-100');
    });
  });
});
