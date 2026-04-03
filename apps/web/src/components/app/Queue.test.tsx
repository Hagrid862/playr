import { PlayerState, usePlayerStore } from '@/stores/player-store/player.store';
import { testQueueItem } from '@/test-utils/queue-test-fixtures';
import type { DragEndEvent } from '@dnd-kit/core';
import type { PlaybackTrack, QueueItem } from '@repo/contracts';
import { customRender } from '@repo/testing/web';
import { fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Queue } from './Queue';
import { createPlayerStateMock } from './test-utils/player-test-utils';
vi.mock('@/stores/player-store/player.store', () => ({
  usePlayerStore: vi.fn(),
}));

vi.mock('./queue/QueueHeader', () => ({
  QueueHeader: ({
    onShowHistory,
    onToggleQueue,
  }: {
    onShowHistory: () => void;
    onToggleQueue: () => void;
  }) => (
    <div data-testid="queue-header">
      <button type="button" onClick={onShowHistory}>
        Show History
      </button>
      <button type="button" onClick={onToggleQueue}>
        Toggle Queue
      </button>
    </div>
  ),
}));

vi.mock('./queue/QueueNextUp', () => ({
  QueueNextUp: ({
    onPlayTrack,
    onRemoveTrack,
    onDragEnd,
  }: {
    onPlayTrack: (t: QueueItem) => void;
    onRemoveTrack: (id: string, e: React.MouseEvent) => void;
    onDragEnd: (e: DragEndEvent) => void;
  }) => (
    <div data-testid="queue-next-up">
      <button
        type="button"
        onClick={() =>
          onPlayTrack(
            testQueueItem({
              queueId: '01900000-0000-7000-8000-0000000001a2',
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
          )
        }
      >
        Play Next
      </button>
      <button
        type="button"
        onClick={(e) =>
          onRemoveTrack('01900000-0000-7000-8000-0000000001a2', e as unknown as React.MouseEvent)
        }
      >
        Remove Next
      </button>
      <button
        type="button"
        onClick={() =>
          onDragEnd({
            active: { id: '01900000-0000-7000-8000-0000000001a2' },
            over: { id: '01900000-0000-7000-8000-0000000001a3' },
          } as unknown as DragEndEvent)
        }
      >
        Drag End
      </button>
      <button
        type="button"
        onClick={() =>
          onDragEnd({
            active: { id: '01900000-0000-7000-8000-0000000001a2' },
            over: { id: '01900000-0000-7000-8000-0000000001a2' },
          } as unknown as DragEndEvent)
        }
      >
        Drag Same
      </button>
      <button
        type="button"
        onClick={() =>
          onDragEnd({ active: { id: '4' }, over: { id: '5' } } as unknown as DragEndEvent)
        }
      >
        Drag Invalid
      </button>
      <button
        type="button"
        onClick={() =>
          onDragEnd({
            active: { id: '01900000-0000-7000-8000-0000000001a2' },
            over: null,
          } as unknown as DragEndEvent)
        }
      >
        Drag No Over
      </button>
    </div>
  ),
}));

vi.mock('./History', () => ({
  History: ({ isVisible, onBack }: { isVisible: boolean; onBack: () => void }) => (
    <div data-testid="queue-history" data-visible={isVisible}>
      <button type="button" onClick={onBack}>
        Back to Main
      </button>
    </div>
  ),
}));

function queueItemStub(
  queueId: string,
  trackId: string,
  position = 0,
  originalPosition?: number,
): QueueItem {
  return {
    queueId,
    position,
    originalPosition: originalPosition ?? position,
    type: 'queue',
    track: {
      id: trackId,
      title: `Track ${trackId}`,
      trackId,
      artists: [],
      albumName: 'Album',
      albumId: 'album-1',
      albumArt: null,
      duration: 0,
      explicit: false,
    },
  };
}

const Q1 = '01900000-0000-7000-8000-0000000001a1';
const Q2 = '01900000-0000-7000-8000-0000000001a2';
const Q3 = '01900000-0000-7000-8000-0000000001a3';
const Q_STUB = '01900000-0000-7000-8000-000000000199';

describe('Queue', () => {
  const mockPlayQueueItem = vi.fn();
  const mockRemoveFromQueue = vi.fn();
  const mockToggleQueue = vi.fn();
  const mockReorderQueue = vi.fn();

  const defaultQueueState = (): PlayerState =>
    createPlayerStateMock({
      queue: [
        queueItemStub(Q1, '1', 0, 0),
        queueItemStub(Q2, '2', 1, 1),
        queueItemStub(Q3, '3', 2, 99),
      ],
      currentTrack: {
        id: '1',
        title: 'Track 1',
        trackId: '1',
        artists: ['Artist 1'],
        albumName: 'Album 1',
        albumId: '1',
        albumArt: 'cover.jpg',
        duration: 100,
        explicit: false,
      } as PlaybackTrack,
      playQueueItem: mockPlayQueueItem,
      removeFromQueue: mockRemoveFromQueue,
      toggleQueue: mockToggleQueue,
      reorderQueue: mockReorderQueue,
      isQueueOpen: true,
      isShuffled: false,
    });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePlayerStore).mockReturnValue(defaultQueueState());
  });

  describe('rendering', () => {
    it('renders correctly', () => {
      customRender(<Queue />);
      expect(screen.getByTestId('queue-header')).toBeInTheDocument();
      expect(screen.getByTestId('queue-next-up')).toBeInTheDocument();
      expect(screen.getByTestId('queue-history')).toHaveAttribute('data-visible', 'false');
    });

    it('calculates nextUp correctly when currentTrack is null', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        createPlayerStateMock({
          queue: [queueItemStub(Q_STUB, '1')],
          currentTrack: null,
        }),
      );

      customRender(<Queue />);
      expect(screen.getByTestId('queue-header')).toBeInTheDocument();
    });
  });

  describe('history view', () => {
    it('switches to history view and back', () => {
      customRender(<Queue />);

      fireEvent.click(screen.getByText('Show History'));
      expect(screen.getByTestId('queue-history')).toHaveAttribute('data-visible', 'true');

      fireEvent.click(screen.getByText('Back to Main'));
      expect(screen.getByTestId('queue-history')).toHaveAttribute('data-visible', 'false');
    });

    it('resets to main view when queue closes', () => {
      const { rerender } = customRender(<Queue />);

      fireEvent.click(screen.getByText('Show History'));
      expect(screen.getByTestId('queue-history')).toHaveAttribute('data-visible', 'true');

      vi.mocked(usePlayerStore).mockReturnValue(
        createPlayerStateMock({
          queue: [],
          currentTrack: null,
          playQueueItem: mockPlayQueueItem,
          removeFromQueue: mockRemoveFromQueue,
          toggleQueue: mockToggleQueue,
          reorderQueue: mockReorderQueue,
          isQueueOpen: false,
          isShuffled: false,
        }),
      );

      rerender(<Queue />);
      expect(screen.getByTestId('queue-history')).toHaveAttribute('data-visible', 'false');
    });
  });

  describe('queue actions', () => {
    it('handles remove track', () => {
      customRender(<Queue />);
      fireEvent.click(screen.getByText('Remove Next'));
      expect(mockRemoveFromQueue).toHaveBeenCalledWith(Q2);
    });

    it('handles play track', () => {
      customRender(<Queue />);
      fireEvent.click(screen.getByText('Play Next'));
      expect(mockPlayQueueItem).toHaveBeenCalledWith(Q2);
    });

    it('handles toggle queue', () => {
      customRender(<Queue />);
      fireEvent.click(screen.getByText('Toggle Queue'));
      expect(mockToggleQueue).toHaveBeenCalled();
    });
  });

  describe('drag reorder', () => {
    it('handles drag end to reorder queue', () => {
      customRender(<Queue />);
      fireEvent.click(screen.getByText('Drag End'));

      // UI applies `reorderKeepingPartitions` after `arrayMove` so position/originalPosition match indices before `reorderQueue`.
      const expectedQueue: QueueItem[] = [
        queueItemStub(Q1, '1', 0, 0),
        queueItemStub(Q3, '3', 1, 1),
        queueItemStub(Q2, '2', 2, 2),
      ];

      expect(mockReorderQueue).toHaveBeenCalledWith(expectedQueue);
    });

    it('does not reorder if active and over are the same', () => {
      customRender(<Queue />);
      fireEvent.click(screen.getByText('Drag Same'));
      expect(mockReorderQueue).not.toHaveBeenCalled();
    });

    it('does not reorder if item not found', () => {
      customRender(<Queue />);
      fireEvent.click(screen.getByText('Drag Invalid'));
      expect(mockReorderQueue).not.toHaveBeenCalled();
    });

    it('does not reorder if over is null', () => {
      customRender(<Queue />);
      fireEvent.click(screen.getByText('Drag No Over'));
      expect(mockReorderQueue).not.toHaveBeenCalled();
    });
  });
});
