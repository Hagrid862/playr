import { PlayerState, QueueItem, usePlayerStore } from '@/stores/player.store';
import { customRender } from '@repo/testing/web';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { History } from './History';
import { createPlayerStateMock } from './test-utils/player-test-utils';

vi.mock('@/stores/player.store', () => ({
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
            {
              uniqueId: '1',
              id: 'track-1',
              title: 'Track 1',
              artists: ['Artist 1'],
              albumArt: '',
              albumName: '',
              albumId: '',
              duration: 0,
            } as QueueItem,
            {
              uniqueId: '2',
              id: 'track-2',
              title: 'Track 2',
              artists: ['Artist 2'],
              albumArt: 'cover.jpg',
              album: { cover: { url: 'cover.jpg' } },
              albumName: '',
              albumId: '',
              duration: 0,
            } as QueueItem,
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
      const track = {
        uniqueId: '1',
        id: 'track-1',
        title: 'Track 1',
        artists: ['Artist 1'],
        albumArt: '',
        albumName: '',
        albumId: '',
        duration: 0,
      } as QueueItem;
      vi.mocked(usePlayerStore).mockReturnValue(
        createPlayerStateMock({
          history: [track],
          playTrack: mockPlayTrack,
          toggleQueue: mockToggleQueue,
        }),
      );

      customRender(<History isVisible={true} onBack={mockOnBack} />);
      fireEvent.click(screen.getByText('Track 1'));
      expect(mockPlayTrack).toHaveBeenCalledWith(track);
    });

    it('handles load more functionality', () => {
      const history = Array.from({ length: 25 }).map((_, i) => ({
        uniqueId: String(i),
        id: `track-${i}`,
        title: `Track ${i}`,
        artists: ['Artist'],
        albumArt: '',
        albumName: '',
        albumId: '',
        duration: 0,
      })) as QueueItem[];

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
