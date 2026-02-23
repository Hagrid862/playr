import { PlayerState, QueueItem, usePlayerStore } from '@/stores/player.store';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { History } from './History';

vi.mock('@/stores/player.store', () => ({
  usePlayerStore: vi.fn(),
}));

describe('History', () => {
  const mockPlayTrack = vi.fn();
  const mockToggleQueue = vi.fn();
  const mockOnBack = vi.fn();

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
    removeFromQueue: vi.fn(),
    reorderQueue: vi.fn(),
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
      history: [],
      playTrack: mockPlayTrack,
      toggleQueue: mockToggleQueue,
    }));
  });

  it('renders empty state when history is empty', () => {
    render(<History isVisible={true} onBack={mockOnBack} />);
    expect(screen.getByText('No listening history')).toBeInTheDocument();
  });

  it('renders history tracks', () => {
    vi.mocked(usePlayerStore).mockReturnValue(mockPlayerStore({
      history: [
        { uniqueId: '1', title: 'Track 1', artists: [{ name: 'Artist 1' }] } as QueueItem,
        {
          uniqueId: '2',
          title: 'Track 2',
          artists: [{ name: 'Artist 2' }],
          album: { cover: { url: 'cover.jpg' } },
        } as QueueItem,
      ],
      playTrack: mockPlayTrack,
      toggleQueue: mockToggleQueue,
    }));

    render(<History isVisible={true} onBack={mockOnBack} />);
    expect(screen.getByText('Track 1')).toBeInTheDocument();
    expect(screen.getByText('Artist 1')).toBeInTheDocument();
    expect(screen.getByText('Track 2')).toBeInTheDocument();
    expect(screen.getByAltText('Track 2')).toHaveAttribute('src', 'cover.jpg');
  });

  it('calls playTrack when a track is clicked', () => {
    const track = { uniqueId: '1', title: 'Track 1', artists: [{ name: 'Artist 1' }] } as QueueItem;
    vi.mocked(usePlayerStore).mockReturnValue(mockPlayerStore({
      history: [track],
      playTrack: mockPlayTrack,
      toggleQueue: mockToggleQueue,
    }));

    render(<History isVisible={true} onBack={mockOnBack} />);
    fireEvent.click(screen.getByText('Track 1'));
    expect(mockPlayTrack).toHaveBeenCalledWith(track);
  });

  it('calls onBack when back button is clicked', () => {
    render(<History isVisible={true} onBack={mockOnBack} />);
    fireEvent.click(screen.getByTitle('Back to Queue'));
    expect(mockOnBack).toHaveBeenCalled();
  });

  it('calls toggleQueue when close button is clicked', () => {
    render(<History isVisible={true} onBack={mockOnBack} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]);
    expect(mockToggleQueue).toHaveBeenCalled();
  });

  it('handles load more functionality', () => {
    const history = Array.from({ length: 25 }).map((_, i) => ({
      uniqueId: String(i),
      title: `Track ${i}`,
      artists: [{ name: 'Artist' }],
    })) as QueueItem[];

    vi.mocked(usePlayerStore).mockReturnValue(mockPlayerStore({
      history,
      playTrack: mockPlayTrack,
      toggleQueue: mockToggleQueue,
    }));

    render(<History isVisible={true} onBack={mockOnBack} />);

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

  it('applies correct classes based on isVisible', () => {
    const { container, rerender } = render(<History isVisible={true} onBack={mockOnBack} />);
    expect(container.firstChild).toHaveClass('opacity-100');
    expect(container.firstChild).not.toHaveClass('opacity-0');

    rerender(<History isVisible={false} onBack={mockOnBack} />);
    expect(container.firstChild).toHaveClass('opacity-0');
    expect(container.firstChild).not.toHaveClass('opacity-100');
  });
});
