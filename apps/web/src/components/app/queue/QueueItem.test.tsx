import type { QueueItem as PlayrQueueItem } from '@/stores/player.store';
import {
  albumBuilder,
  artistBuilder,
  customRender,
  imageBuilder,
  trackBuilder,
} from '@repo/testing';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QueueItem, QueueItemOverlay } from './QueueItem';

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
  const mockTrack: PlayrQueueItem = {
    uniqueId: '1',
    ...trackBuilder({ title: 'Test Title' }),
    artists: [artistBuilder({ name: 'Test Artist' })],
    album: {
      ...albumBuilder({ name: 'Test Album' }),
      cover: imageBuilder({ url: 'http://example.com/cover.jpg' }),
    },
  };

  describe('rendering', () => {
    it('renders track details correctly', () => {
      const onPlay = vi.fn();
      const onRemove = vi.fn();

      customRender(<QueueItem track={mockTrack} onPlay={onPlay} onRemove={onRemove} />);

      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test Artist')).toBeInTheDocument();
      expect(screen.getByAltText('Test Title')).toHaveAttribute(
        'src',
        'http://example.com/cover.jpg',
      );
    });

    it('renders fallback icon without cover', () => {
      const noCoverTrack: PlayrQueueItem = {
        uniqueId: '2',
        ...trackBuilder({ title: 'Test Title 2' }),
        artists: [artistBuilder({ name: 'Test Artist' })],
        album: { ...albumBuilder({ name: 'Test Album' }), cover: null },
      };

      customRender(<QueueItem track={noCoverTrack} onPlay={vi.fn()} onRemove={vi.fn()} />);
      expect(screen.queryByAltText('Test Title 2')).not.toBeInTheDocument();
    });

    it('joins multiple artist names correctly', () => {
      const multiArtistTrack: PlayrQueueItem = {
        uniqueId: '3',
        ...trackBuilder({ title: 'Test Title 3' }),
        artists: [artistBuilder({ name: 'Artist A' }), artistBuilder({ name: 'Artist B' })],
        album: {
          ...albumBuilder({ name: 'Test Album' }),
          cover: imageBuilder({ url: 'http://example.com/cover.jpg' }),
        },
      };

      customRender(<QueueItem track={multiArtistTrack} onPlay={vi.fn()} onRemove={vi.fn()} />);
      expect(screen.getByText('Artist A, Artist B')).toBeInTheDocument();
    });

    it('disables hover styles when isDragActive is true', () => {
      const { container } = customRender(
        <QueueItem track={mockTrack} onPlay={vi.fn()} onRemove={vi.fn()} isDragActive={true} />,
      );
      const group = container.querySelector('.group');
      expect(group).not.toHaveClass('hover:bg-white/5');
    });
  });

  describe('interactions', () => {
    it('handles play click', () => {
      const onPlay = vi.fn();
      const onRemove = vi.fn();

      customRender(<QueueItem track={mockTrack} onPlay={onPlay} onRemove={onRemove} />);
      const container = screen.getByText('Test Title').closest('.group');
      fireEvent.click(container!);

      expect(onPlay).toHaveBeenCalledWith(mockTrack);
    });

    it('handles remove click', () => {
      const onPlay = vi.fn();
      const onRemove = vi.fn();

      customRender(<QueueItem track={mockTrack} onPlay={onPlay} onRemove={onRemove} />);

      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[buttons.length - 1]);
      expect(onRemove).toHaveBeenCalledWith('1', expect.anything());
    });

    it('stops propagation when clicking the drag handle', () => {
      const onPlay = vi.fn();
      const onRemove = vi.fn();

      customRender(<QueueItem track={mockTrack} onPlay={onPlay} onRemove={onRemove} />);

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

      customRender(<QueueItem track={mockTrack} onPlay={vi.fn()} onRemove={vi.fn()} />);
      const container = screen.getByText('Test Title').closest('.group');
      expect(container).toHaveStyle({ zIndex: 1 });
    });
  });
});

describe('QueueItemOverlay', () => {
  const mockTrack: PlayrQueueItem = {
    uniqueId: '1',
    ...trackBuilder({ title: 'Test Title' }),
    artists: [artistBuilder({ name: 'Test Artist' })],
    album: {
      ...albumBuilder({ name: 'Test Album' }),
      cover: imageBuilder({ url: 'http://example.com/cover.jpg' }),
    },
  };

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
      const noCoverTrack: PlayrQueueItem = {
        uniqueId: '2',
        ...trackBuilder({ title: 'Test Title 2' }),
        artists: [artistBuilder({ name: 'Test Artist' })],
        album: { ...albumBuilder({ name: 'Test Album' }), cover: null },
      };

      customRender(<QueueItemOverlay track={noCoverTrack} />);
      expect(screen.getByText('Test Title 2')).toBeInTheDocument();
      expect(screen.queryByAltText('Test Title 2')).not.toBeInTheDocument();
    });

    it('joins multiple artist names correctly', () => {
      const multiArtistTrack: PlayrQueueItem = {
        uniqueId: '3',
        ...trackBuilder({ title: 'Test Title 3' }),
        artists: [artistBuilder({ name: 'Artist A' }), artistBuilder({ name: 'Artist B' })],
        album: {
          ...albumBuilder({ name: 'Test Album' }),
          cover: imageBuilder({ url: 'http://example.com/cover.jpg' }),
        },
      };

      customRender(<QueueItemOverlay track={multiArtistTrack} />);
      expect(screen.getByText('Artist A, Artist B')).toBeInTheDocument();
    });
  });
});
