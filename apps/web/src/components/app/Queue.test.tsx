import { PlayerState, QueueItem, usePlayerStore } from '@/stores/player.store';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Queue } from './Queue';

vi.mock('@/stores/player.store', () => ({
  usePlayerStore: vi.fn(),
}));

vi.mock('./queue/QueueHeader', () => ({
  QueueHeader: ({ onShowHistory, onToggleQueue }: { onShowHistory: () => void; onToggleQueue: () => void }) => (
    <div data-testid="queue-header">
      <button onClick={onShowHistory}>Show History</button>
      <button onClick={onToggleQueue}>Toggle Queue</button>
    </div>
  ),
}));

vi.mock('./queue/QueueNowPlaying', () => ({
  QueueNowPlaying: ({ currentTrack }: { currentTrack?: { title: string } }) => (
    <div data-testid="queue-now-playing">{currentTrack?.title}</div>
  ),
}));

vi.mock('./queue/QueueNextUp', () => ({
  QueueNextUp: ({ onPlayTrack, onRemoveTrack, onDragEnd }: { onPlayTrack: (t: unknown) => void; onRemoveTrack: (id: string, e: unknown) => void; onDragEnd: (e: unknown) => void }) => (
    <div data-testid="queue-next-up">
      <button onClick={() => onPlayTrack({ uniqueId: '2' })}>Play Next</button>
      <button onClick={(e) => onRemoveTrack('2', e)}>Remove Next</button>
      <button onClick={() => onDragEnd({ active: { id: '2' }, over: { id: '3' } })}>
        Drag End
      </button>
      <button onClick={() => onDragEnd({ active: { id: '2' }, over: { id: '2' } })}>
        Drag Same
      </button>
      <button onClick={() => onDragEnd({ active: { id: '4' }, over: { id: '5' } })}>
        Drag Invalid
      </button>
      <button onClick={() => onDragEnd({ active: { id: '2' }, over: null })}>Drag No Over</button>
    </div>
  ),
}));

vi.mock('./History', () => ({
  History: ({ isVisible, onBack }: { isVisible: boolean; onBack: () => void }) => (
    <div data-testid="queue-history" data-visible={isVisible}>
      <button onClick={onBack}>Back to Main</button>
    </div>
  ),
}));

describe('Queue', () => {
  const mockPlayTrack = vi.fn();
  const mockRemoveFromQueue = vi.fn();
  const mockToggleQueue = vi.fn();
  const mockReorderQueue = vi.fn();

  const mockPlayerStore = (overrides?: Partial<PlayerState>): PlayerState => ({
    currentTrack: null,
    isPlaying: false,
    volume: 1,
    currentTime: 0,
    duration: 0,
    quality: 'auto',
    availableQualities: ['auto'],
    queue: [],
    originalQueue: [],
    history: [],
    repeatMode: 'off',
    isShuffled: false,
    playTrack: mockPlayTrack,
    pause: vi.fn(),
    resume: vi.fn(),
    togglePlay: vi.fn(),
    setVolume: vi.fn(),
    setCurrentTime: vi.fn(),
    setDuration: vi.fn(),
    setQuality: vi.fn(),
    setAvailableQualities: vi.fn(),
    setQueue: vi.fn(),
    nextTrack: vi.fn(),
    previousTrack: vi.fn(),
    toggleRepeatMode: vi.fn(),
    toggleShuffle: vi.fn(),
    addToQueue: vi.fn(),
    playNext: vi.fn(),
    removeFromQueue: mockRemoveFromQueue,
    reorderQueue: mockReorderQueue,
    addToHistory: vi.fn(),
    isQueueOpen: false,
    sidebarView: 'queue',
    toggleQueue: mockToggleQueue,
    setQueueOpen: vi.fn(),
    setSidebarView: vi.fn(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePlayerStore).mockReturnValue(mockPlayerStore({
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
    }));
  });

  it('renders correctly', () => {
    render(<Queue />);
    expect(screen.getByTestId('queue-header')).toBeInTheDocument();
    expect(screen.getByTestId('queue-now-playing')).toBeInTheDocument();
    expect(screen.getByTestId('queue-next-up')).toBeInTheDocument();
    expect(screen.getByTestId('queue-history')).toHaveAttribute('data-visible', 'false');
  });

  it('switches to history view and back', () => {
    render(<Queue />);

    fireEvent.click(screen.getByText('Show History'));
    expect(screen.getByTestId('queue-history')).toHaveAttribute('data-visible', 'true');

    fireEvent.click(screen.getByText('Back to Main'));
    expect(screen.getByTestId('queue-history')).toHaveAttribute('data-visible', 'false');
  });

  it('resets to main view when queue closes', () => {
    const { rerender } = render(<Queue />);

    fireEvent.click(screen.getByText('Show History'));
    expect(screen.getByTestId('queue-history')).toHaveAttribute('data-visible', 'true');

    vi.mocked(usePlayerStore).mockReturnValue(mockPlayerStore({
      queue: [],
      currentTrack: null,
      playTrack: mockPlayTrack,
      removeFromQueue: mockRemoveFromQueue,
      toggleQueue: mockToggleQueue,
      reorderQueue: mockReorderQueue,
      isQueueOpen: false, // queue closed
      isShuffled: false,
    }));

    rerender(<Queue />);
    expect(screen.getByTestId('queue-history')).toHaveAttribute('data-visible', 'false');
  });

  it('handles remove track', () => {
    render(<Queue />);
    fireEvent.click(screen.getByText('Remove Next'));
    expect(mockRemoveFromQueue).toHaveBeenCalledWith('2');
  });

  it('handles play track', () => {
    render(<Queue />);
    fireEvent.click(screen.getByText('Play Next'));
    expect(mockPlayTrack).toHaveBeenCalledWith({ uniqueId: '2' });
  });

  it('handles toggle queue', () => {
    render(<Queue />);
    fireEvent.click(screen.getByText('Toggle Queue'));
    expect(mockToggleQueue).toHaveBeenCalled();
  });

  it('handles drag end to reorder queue', () => {
    render(<Queue />);
    fireEvent.click(screen.getByText('Drag End'));

    expect(mockReorderQueue).toHaveBeenCalledWith([
      { uniqueId: '1', title: 'Track 1' },
      { uniqueId: '3', title: 'Track 3' },
      { uniqueId: '2', title: 'Track 2' },
    ]);
  });

  it('does not reorder if active and over are the same', () => {
    render(<Queue />);
    fireEvent.click(screen.getByText('Drag Same'));
    expect(mockReorderQueue).not.toHaveBeenCalled();
  });

  it('does not reorder if item not found', () => {
    render(<Queue />);
    fireEvent.click(screen.getByText('Drag Invalid'));
    expect(mockReorderQueue).not.toHaveBeenCalled();
  });

  it('does not reorder if over is null', () => {
    render(<Queue />);
    fireEvent.click(screen.getByText('Drag No Over'));
    expect(mockReorderQueue).not.toHaveBeenCalled();
  });

  it('calculates nextUp correctly when currentTrack is null', () => {
    vi.mocked(usePlayerStore).mockReturnValue(mockPlayerStore({
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
    }));

    render(<Queue />);
    expect(screen.getByTestId('queue-header')).toBeInTheDocument();
  });
});
