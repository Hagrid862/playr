import { testQueueItem } from '@/test-utils/queue-test-fixtures';
import type { QueueItem } from '@repo/contracts';
import { customRender } from '@repo/testing/web';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QueueItem as QueueItemComponent, QueueItemOverlay } from './QueueItem';

import { useSortable } from '@dnd-kit/sortable';

vi.mock('@dnd-kit/sortable', () => ({
  useSortable: vi.fn(() => ({
    attributes: {
      'aria-describedby': 'DndDescribedBy-0',
      'aria-disabled': false,
      'aria-roledescription': 'sortable',
      role: 'button',
      tabIndex: 0,
    },
    listeners: {
      onKeyDown: vi.fn(),
      onPointerDown: vi.fn(),
    },
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  })),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => undefined,
    },
  },
}));

describe('QueueItem', () => {
  const mockTrack: QueueItem = testQueueItem({
    queueId: '01900000-0000-7000-8000-000000000001',
    track: {
      id: '1',
      trackId: '1',
      title: 'Test Title',
      artists: ['Test Artist'],
      albumArt: 'http://example.com/cover.jpg',
      albumName: 'Test Album',
      albumId: '1',
      duration: 100,
      explicit: false,
    },
  });

  describe('rendering', () => {
    it('renders track details correctly', () => {
      const onPlay = vi.fn();
      const onRemove = vi.fn();

      customRender(<QueueItemComponent track={mockTrack} onPlay={onPlay} onRemove={onRemove} />);

      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test Artist')).toBeInTheDocument();
      expect(screen.getByAltText('Test Title')).toHaveAttribute(
        'src',
        'http://example.com/cover.jpg',
      );
    });

    it('renders fallback icon without cover', () => {
      const noCoverTrack: QueueItem = testQueueItem({
        queueId: '01900000-0000-7000-8000-000000000002',
        track: {
          id: '2',
          trackId: '2',
          title: 'Test Title 2',
          artists: ['Test Artist'],
          albumArt: '',
          albumName: 'Test Album',
          albumId: '1',
          duration: 100,
          explicit: false,
        },
      });

      customRender(<QueueItemComponent track={noCoverTrack} onPlay={vi.fn()} onRemove={vi.fn()} />);
      expect(screen.queryByAltText('Test Title 2')).not.toBeInTheDocument();
    });

    it('joins multiple artist names correctly', () => {
      const multiArtistTrack: QueueItem = testQueueItem({
        queueId: '01900000-0000-7000-8000-000000000003',
        track: {
          id: '3',
          trackId: '3',
          title: 'Test Title 3',
          artists: ['Artist A', 'Artist B'],
          albumArt: 'http://example.com/cover.jpg',
          albumName: 'Test Album',
          albumId: '1',
          duration: 100,
          explicit: false,
        },
      });

      customRender(
        <QueueItemComponent track={multiArtistTrack} onPlay={vi.fn()} onRemove={vi.fn()} />,
      );
      expect(screen.getByText('Artist A, Artist B')).toBeInTheDocument();
    });

    it('renders "Unknown Artist" when artists is missing', () => {
      const noArtistTrack: QueueItem = testQueueItem({
        queueId: '01900000-0000-7000-8000-000000000004',
        track: {
          id: '4',
          trackId: '4',
          title: 'No Artist Song',
          artists: [],
          albumArt: '',
          albumName: 'Test Album',
          albumId: '1',
          duration: 100,
          explicit: false,
        },
      });

      customRender(
        <QueueItemComponent track={noArtistTrack} onPlay={vi.fn()} onRemove={vi.fn()} />,
      );
      expect(screen.getByText('Unknown Artist')).toBeInTheDocument();
    });

    it('disables hover styles when isDragActive is true', () => {
      const { container } = customRender(
        <QueueItemComponent
          track={mockTrack}
          onPlay={vi.fn()}
          onRemove={vi.fn()}
          isDragActive={true}
        />,
      );
      const group = container.querySelector('.group');
      expect(group).not.toHaveClass('hover:bg-white/5');
    });
  });

  describe('interactions', () => {
    it('handles play click', () => {
      const onPlay = vi.fn();
      const onRemove = vi.fn();

      customRender(<QueueItemComponent track={mockTrack} onPlay={onPlay} onRemove={onRemove} />);
      const container = screen.getByText('Test Title').closest('.group');
      fireEvent.click(container!);

      expect(onPlay).toHaveBeenCalledWith(mockTrack);
    });

    it('handles remove click', () => {
      const onPlay = vi.fn();
      const onRemove = vi.fn();

      customRender(<QueueItemComponent track={mockTrack} onPlay={onPlay} onRemove={onRemove} />);

      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[buttons.length - 1]);
      expect(onRemove).toHaveBeenCalledWith(mockTrack.queueId, expect.anything());
    });

    it('stops propagation when clicking the drag handle', () => {
      const onPlay = vi.fn();
      const onRemove = vi.fn();

      customRender(<QueueItemComponent track={mockTrack} onPlay={onPlay} onRemove={onRemove} />);

      const container = screen.getByText('Test Title').closest('.group');
      const dragHandle = container!.querySelector('.cursor-grab');

      fireEvent.click(dragHandle!);

      expect(onPlay).not.toHaveBeenCalled();
    });
  });

  describe('drag state', () => {
    it('renders correctly when dragging', () => {
      vi.mocked(useSortable).mockReturnValueOnce({
        attributes: {},
        listeners: {},
        setNodeRef: vi.fn(),
        transform: null,
        transition: undefined,
        isDragging: true,
      } as unknown as ReturnType<typeof useSortable>);

      customRender(<QueueItemComponent track={mockTrack} onPlay={vi.fn()} onRemove={vi.fn()} />);
      const container = screen.getByText('Test Title').closest('.group');
      expect(container).toHaveStyle({ zIndex: 1 });
    });
  });
});

describe('QueueItemOverlay', () => {
  const mockTrack: QueueItem = testQueueItem({
    queueId: '01900000-0000-7000-8000-0000000000a1',
    track: {
      id: '1',
      trackId: '1',
      title: 'Test Title',
      artists: ['Test Artist'],
      albumArt: 'http://example.com/cover.jpg',
      albumName: 'Test Album',
      albumId: '1',
      duration: 100,
      explicit: false,
    },
  });

  describe('rendering', () => {
    it('renders with album cover', () => {
      customRender(<QueueItemOverlay track={mockTrack} />);
      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test Artist')).toBeInTheDocument();
      expect(screen.getByAltText('Test Title')).toHaveAttribute(
        'src',
        'http://example.com/cover.jpg',
      );
    });

    it('renders fallback icon without cover', () => {
      const noCoverTrack: QueueItem = testQueueItem({
        queueId: '01900000-0000-7000-8000-0000000000a2',
        track: {
          id: '2',
          trackId: '2',
          title: 'Test Title 2',
          artists: ['Test Artist'],
          albumArt: '',
          albumName: 'Test Album',
          albumId: '1',
          duration: 100,
          explicit: false,
        },
      });

      customRender(<QueueItemOverlay track={noCoverTrack} />);
      expect(screen.getByText('Test Title 2')).toBeInTheDocument();
      expect(screen.queryByAltText('Test Title 2')).not.toBeInTheDocument();
    });

    it('joins multiple artist names correctly', () => {
      const multiArtistTrack: QueueItem = testQueueItem({
        queueId: '01900000-0000-7000-8000-0000000000a3',
        track: {
          id: '3',
          trackId: '3',
          title: 'Test Title 3',
          artists: ['Artist A', 'Artist B'],
          albumArt: 'http://example.com/cover.jpg',
          albumName: 'Test Album',
          albumId: '1',
          duration: 100,
          explicit: false,
        },
      });

      customRender(<QueueItemOverlay track={multiArtistTrack} />);
      expect(screen.getByText('Artist A, Artist B')).toBeInTheDocument();
    });

    it('renders "Unknown Artist" when artists is missing', () => {
      const noArtistTrack: QueueItem = testQueueItem({
        queueId: '01900000-0000-7000-8000-0000000000a4',
        track: {
          id: '4',
          trackId: '4',
          title: 'No Artist Song',
          artists: [],
          albumArt: '',
          albumName: 'Test Album',
          albumId: '1',
          duration: 100,
          explicit: false,
        },
      });

      customRender(<QueueItemOverlay track={noArtistTrack} />);
      expect(screen.getByText('Unknown Artist')).toBeInTheDocument();
    });
  });
});
