import type { QueueItem as PlayrQueueItem } from '@/stores/player.store';
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QueueNextUp } from './QueueNextUp';

const capturedDndHandlers: {
  onDragStart: ((e: DragStartEvent) => void) | null;
  onDragOver: ((e: DragOverEvent) => void) | null;
  onDragEnd: ((e: DragEndEvent) => void) | null;
} = { onDragStart: null, onDragOver: null, onDragEnd: null };

vi.mock('@dnd-kit/core', async () => {
  const actual = await vi.importActual<typeof import('@dnd-kit/core')>('@dnd-kit/core');
  const React = await import('react');
  return {
    ...actual,
    DndContext: (props: React.ComponentProps<typeof actual.DndContext>) => {
      capturedDndHandlers.onDragStart = props.onDragStart ?? null;
      capturedDndHandlers.onDragOver = props.onDragOver ?? null;
      capturedDndHandlers.onDragEnd = props.onDragEnd ?? null;
      return React.createElement(actual.DndContext, props);
    },
    DragOverlay: ({ children }: { children?: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'dnd-drag-overlay' }, children),
  };
});

vi.mock('./QueueItem', () => ({
  QueueItem: ({
    track,
    onPlay,
    onRemove,
  }: {
    track: PlayrQueueItem;
    onPlay: (track: PlayrQueueItem) => void;
    onRemove: (id: string, e: React.MouseEvent<HTMLButtonElement>) => void;
  }) => (
    <div data-testid={`queue-item-${track.uniqueId}`}>
      {track.title}
      <button onClick={() => onPlay(track)}>Play</button>
      <button onClick={(e) => onRemove(track.uniqueId, e)}>Remove</button>
    </div>
  ),
  QueueItemOverlay: ({ track }: { track: PlayrQueueItem }) => (
    <div data-testid="queue-item-overlay">{track.title}</div>
  ),
}));

describe('QueueNextUp', () => {
  const mockNextUp = [
    { uniqueId: '1', title: 'Track 1' },
    { uniqueId: '2', title: 'Track 2' },
  ] as PlayrQueueItem[];

  it('renders correctly with tracks', () => {
    render(
      <QueueNextUp
        nextUp={mockNextUp}
        isShuffled={false}
        onDragEnd={vi.fn()}
        onPlayTrack={vi.fn()}
        onRemoveTrack={vi.fn()}
      />,
    );
    expect(screen.getByText('Next Up')).toBeInTheDocument();
    expect(screen.getByTestId('queue-item-1')).toBeInTheDocument();
    expect(screen.getByTestId('queue-item-2')).toBeInTheDocument();
  });

  it('renders empty state', () => {
    render(
      <QueueNextUp
        nextUp={[]}
        isShuffled={false}
        onDragEnd={vi.fn()}
        onPlayTrack={vi.fn()}
        onRemoveTrack={vi.fn()}
      />,
    );
    expect(screen.getByText('Queue is empty')).toBeInTheDocument();
  });

  it('renders correctly when shuffled', () => {
    render(
      <QueueNextUp
        nextUp={mockNextUp}
        isShuffled={true}
        onDragEnd={vi.fn()}
        onPlayTrack={vi.fn()}
        onRemoveTrack={vi.fn()}
      />,
    );
    expect(screen.getByTestId('queue-item-1')).toBeInTheDocument();
    expect(screen.getByTestId('queue-item-2')).toBeInTheDocument();
  });

  it('shows overlay when drag starts', async () => {
    render(
      <QueueNextUp
        nextUp={mockNextUp}
        isShuffled={false}
        onDragEnd={vi.fn()}
        onPlayTrack={vi.fn()}
        onRemoveTrack={vi.fn()}
      />,
    );
    expect(capturedDndHandlers.onDragStart).toBeDefined();
    await act(async () => {
      capturedDndHandlers.onDragStart!({
        active: { id: '1' },
        delta: { x: 0, y: 0 },
        activatorEvent: new Event('dragstart'),
      } as unknown as DragStartEvent);
    });
    expect(screen.getByTestId('queue-item-overlay')).toHaveTextContent('Track 1');
  });

  it('calls onDragEnd when drag ends', async () => {
    const onDragEnd = vi.fn();
    render(
      <QueueNextUp
        nextUp={mockNextUp}
        isShuffled={false}
        onDragEnd={onDragEnd}
        onPlayTrack={vi.fn()}
        onRemoveTrack={vi.fn()}
      />,
    );
    await act(async () => {
      capturedDndHandlers.onDragStart!({
        active: { id: '1' },
        delta: { x: 0, y: 0 },
        activatorEvent: new Event('dragstart'),
      } as unknown as DragStartEvent);
    });
    const mockEvent = {
      active: { id: '1' },
      over: { id: '2' },
      delta: { x: 0, y: 0 },
    } as DragEndEvent;
    await act(async () => {
      capturedDndHandlers.onDragEnd!(mockEvent);
    });
    expect(onDragEnd).toHaveBeenCalledWith(mockEvent);
  });

  it('sets drop line position to top when dragging down', async () => {
    const { container } = render(
      <QueueNextUp
        nextUp={mockNextUp}
        isShuffled={false}
        onDragEnd={vi.fn()}
        onPlayTrack={vi.fn()}
        onRemoveTrack={vi.fn()}
      />,
    );
    await act(async () => {
      capturedDndHandlers.onDragOver!({
        active: { id: '2' },
        over: { id: '1' },
        delta: { x: 0, y: 0 },
      } as DragOverEvent);
    });
    const visibleDropLines = container.querySelectorAll('[class*="opacity-100"]');
    expect(visibleDropLines.length).toBeGreaterThan(0);
  });

  it('sets drop line position to bottom when dragging up', async () => {
    const { container } = render(
      <QueueNextUp
        nextUp={mockNextUp}
        isShuffled={false}
        onDragEnd={vi.fn()}
        onPlayTrack={vi.fn()}
        onRemoveTrack={vi.fn()}
      />,
    );
    await act(async () => {
      capturedDndHandlers.onDragOver!({
        active: { id: '1' },
        over: { id: '2' },
        delta: { x: 0, y: 0 },
      } as DragOverEvent);
    });
    const visibleDropLines = container.querySelectorAll('[class*="opacity-100"]');
    expect(visibleDropLines.length).toBeGreaterThan(0);
  });

  it('clears over state when dragging over nothing', async () => {
    render(
      <QueueNextUp
        nextUp={mockNextUp}
        isShuffled={false}
        onDragEnd={vi.fn()}
        onPlayTrack={vi.fn()}
        onRemoveTrack={vi.fn()}
      />,
    );
    await act(async () => {
      capturedDndHandlers.onDragOver!({
        active: { id: '1' },
        over: { id: '2' },
        delta: { x: 0, y: 0 },
      } as DragOverEvent);
    });
    await act(async () => {
      capturedDndHandlers.onDragOver!({
        active: { id: '1' },
        over: null,
        delta: { x: 0, y: 0 },
      } as DragOverEvent);
    });
    const visibleDropLines = document.querySelectorAll('[class*="opacity-100"]');
    const dropLineElements = Array.from(visibleDropLines).filter(
      (el) =>
        (el as HTMLElement).classList.contains('rounded-full') &&
        (el as HTMLElement).classList.contains('transition-all'),
    );
    expect(dropLineElements.length).toBe(0);
  });
});
