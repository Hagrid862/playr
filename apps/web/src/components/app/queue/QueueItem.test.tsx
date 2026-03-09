import type { QueueItem as PlayrQueueItem } from '@/stores/player.store';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QueueItem } from './QueueItem';

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
  const mockTrack = {
    uniqueId: 'test-1',
    title: 'Test Title',
    artists: [{ name: 'Test Artist' }],
    album: { cover: { url: 'http://example.com/cover.jpg' } },
  } as PlayrQueueItem;

  it('renders track details correctly', () => {
    const onPlay = vi.fn();
    const onRemove = vi.fn();

    render(<QueueItem track={mockTrack} onPlay={onPlay} onRemove={onRemove} />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Artist')).toBeInTheDocument();
    expect(screen.getByAltText('Test Title')).toHaveAttribute(
      'src',
      'http://example.com/cover.jpg',
    );
  });

  it('handles play click', () => {
    const onPlay = vi.fn();
    const onRemove = vi.fn();

    render(<QueueItem track={mockTrack} onPlay={onPlay} onRemove={onRemove} />);
    const container = screen.getByText('Test Title').closest('.group');
    fireEvent.click(container!);

    expect(onPlay).toHaveBeenCalledWith(mockTrack);
  });

  it('handles remove click', () => {
    const onPlay = vi.fn();
    const onRemove = vi.fn();

    render(<QueueItem track={mockTrack} onPlay={onPlay} onRemove={onRemove} />);

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);
    expect(onRemove).toHaveBeenCalledWith('test-1', expect.anything());
  });

  it('renders fallback icon without cover', () => {
    const noCoverTrack = {
      ...mockTrack,
      album: { cover: null },
    } as unknown as PlayrQueueItem;

    render(<QueueItem track={noCoverTrack} onPlay={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.queryByAltText('Test Title')).not.toBeInTheDocument();
  });

  it('stops propagation when clicking the drag handle', () => {
    const onPlay = vi.fn();
    const onRemove = vi.fn();

    render(<QueueItem track={mockTrack} onPlay={onPlay} onRemove={onRemove} />);

    // The DotsSixVerticalIcon is inside a div.
    const container = screen.getByText('Test Title').closest('.group');
    const dragHandle = container!.querySelector('.cursor-grab');

    fireEvent.click(dragHandle!);

    // Stop propagation should prevent the onPlay handler from being invoked
    expect(onPlay).not.toHaveBeenCalled();
  });

  it('renders correctly when dragging', () => {
    vi.mocked(useSortable).mockReturnValueOnce({
      attributes: {},
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
      transition: undefined,
      isDragging: true,
    } as unknown as ReturnType<typeof useSortable>);

    render(<QueueItem track={mockTrack} onPlay={vi.fn()} onRemove={vi.fn()} />);
    const container = screen.getByText('Test Title').closest('.group');
    expect(container).toHaveStyle({ zIndex: 1 });
  });
});
