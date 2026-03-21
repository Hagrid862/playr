import { PlayerState, QueueItem, usePlayerStore } from '@/stores/player.store';
import type { DragEndEvent } from '@dnd-kit/core';
import { customRender } from '@repo/testing';
import { fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Queue } from './Queue';
import { createPlayerStateMock } from './test-utils/player-test-utils';

vi.mock('@/stores/player.store', () => ({
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

vi.mock('./queue/QueueNowPlaying', () => ({
  QueueNowPlaying: ({ currentTrack }: { currentTrack?: { title: string } }) => (
    <div data-testid="queue-now-playing">{currentTrack?.title}</div>
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
      <button type="button" onClick={() => onPlayTrack({ uniqueId: '2' } as QueueItem)}>
        Play Next
      </button>
      <button type="button" onClick={(e) => onRemoveTrack('2', e as unknown as React.MouseEvent)}>
        Remove Next
      </button>
      <button
        type="button"
        onClick={() =>
          onDragEnd({ active: { id: '2' }, over: { id: '3' } } as unknown as DragEndEvent)
        }
      >
        Drag End
      </button>
      <button
        type="button"
        onClick={() =>
          onDragEnd({ active: { id: '2' }, over: { id: '2' } } as unknown as DragEndEvent)
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
        onClick={() => onDragEnd({ active: { id: '2' }, over: null } as unknown as DragEndEvent)}
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

describe('Queue', () => {
  const mockPlayTrack = vi.fn();
  const mockRemoveFromQueue = vi.fn();
  const mockToggleQueue = vi.fn();
  const mockReorderQueue = vi.fn();

  const defaultQueueState = (): PlayerState =>
    createPlayerStateMock({
      queue: [
        { uniqueId: '1', title: 'Track 1' } as QueueItem,
        { uniqueId: '2', title: 'Track 2' } as QueueItem,
        { uniqueId: '3', title: 'Track 3' } as QueueItem,
      ],
      currentTrack: { uniqueId: '1', title: 'Track 1' } as QueueItem,
      playTrack: mockPlayTrack,
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
      expect(screen.getByTestId('queue-now-playing')).toBeInTheDocument();
      expect(screen.getByTestId('queue-next-up')).toBeInTheDocument();
      expect(screen.getByTestId('queue-history')).toHaveAttribute('data-visible', 'false');
    });

    it('calculates nextUp correctly when currentTrack is null', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        createPlayerStateMock({
          queue: [
            { uniqueId: '1', title: 'Track 1' } as QueueItem,
            { uniqueId: '2', title: 'Track 2' } as QueueItem,
          ],
          currentTrack: null,
          playTrack: mockPlayTrack,
          removeFromQueue: mockRemoveFromQueue,
          toggleQueue: mockToggleQueue,
          reorderQueue: mockReorderQueue,
          isQueueOpen: true,
          isShuffled: false,
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
          playTrack: mockPlayTrack,
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
      expect(mockRemoveFromQueue).toHaveBeenCalledWith('2');
    });

    it('handles play track', () => {
      customRender(<Queue />);
      fireEvent.click(screen.getByText('Play Next'));
      expect(mockPlayTrack).toHaveBeenCalledWith({ uniqueId: '2' });
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

      expect(mockReorderQueue).toHaveBeenCalledWith([
        { uniqueId: '1', title: 'Track 1' },
        { uniqueId: '3', title: 'Track 3' },
        { uniqueId: '2', title: 'Track 2' },
      ]);
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
