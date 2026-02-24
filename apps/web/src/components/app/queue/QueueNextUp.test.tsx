import type { QueueItem as PlayrQueueItem } from '@/stores/player.store';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QueueNextUp } from './QueueNextUp';

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
});
