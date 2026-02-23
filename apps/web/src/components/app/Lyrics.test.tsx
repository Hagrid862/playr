import { PlayerState, QueueItem, usePlayerStore } from '@/stores/player.store';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Lyrics } from './Lyrics';

vi.mock('@/stores/player.store', () => ({
  usePlayerStore: vi.fn(),
}));

describe('Lyrics', () => {
  const mockToggleQueue = vi.fn();

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
    playTrack: vi.fn(),
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
  });

  it('renders no track playing when currentTrack is null', () => {
    vi.mocked(usePlayerStore).mockReturnValue(mockPlayerStore({
      currentTrack: null,
      toggleQueue: mockToggleQueue,
    }));

    render(<Lyrics />);
    expect(screen.getByText('No track playing')).toBeInTheDocument();
  });

  it('renders track title and not available message when track is playing', () => {
    vi.mocked(usePlayerStore).mockReturnValue(mockPlayerStore({
      currentTrack: { title: 'Test Song' } as QueueItem,
      toggleQueue: mockToggleQueue,
    }));

    render(<Lyrics />);
    expect(screen.getByText('Test Song')).toBeInTheDocument();
    expect(screen.getByText('Lyrics not available yet.')).toBeInTheDocument();
  });

  it('calls toggleQueue when close button is clicked', () => {
    vi.mocked(usePlayerStore).mockReturnValue(mockPlayerStore({
      currentTrack: null,
      toggleQueue: mockToggleQueue,
    }));

    render(<Lyrics />);
    const closeBtn = screen.getByRole('button');
    fireEvent.click(closeBtn);
    expect(mockToggleQueue).toHaveBeenCalled();
  });
});
