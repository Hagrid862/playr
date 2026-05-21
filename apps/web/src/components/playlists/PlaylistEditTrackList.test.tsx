import { customRender } from '@repo/testing/web';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlaylistEditTrackList } from './PlaylistEditTrackList';

const reorderTracksFromDragEndMock = vi.fn();
const mockDraft = {
  orderedTrackRows: [] as any[],
  draftTrackIds: [] as string[],
  reorderTracksFromDragEnd: reorderTracksFromDragEndMock,
};

vi.mock('@/components/playlists/playlist-edit-draft.context', () => ({
  usePlaylistEditDraft: () => mockDraft,
}));

vi.mock('@/components/library/SongCard', () => ({
  SongCard: ({
    id,
    trackNumber,
    title,
    artists,
    duration,
    isProcessing,
    isFailed,
    artworkUrl,
  }: any) => (
    <div data-testid={`song-card-${id}`}>
      <span>#{trackNumber}</span>
      <span>{title}</span>
      <span>{artists.map((a: any) => a.name).join(', ')}</span>
      <span>{duration}s</span>
      {isProcessing && <span>Processing</span>}
      {isFailed && <span>Failed</span>}
      {artworkUrl && <img src={artworkUrl} alt={title} />}
    </div>
  ),
}));

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children, onDragEnd }: any) => (
    <div data-testid="mock-dnd-context">
      <button
        type="button"
        data-testid="mock-drag-end-trigger"
        onClick={() => onDragEnd?.({ active: { id: 'track-1' }, over: { id: 'track-2' } })}
      >
        DragEnd
      </button>
      {children}
    </div>
  ),
  useSensors: vi.fn(),
  useSensor: vi.fn(),
  PointerSensor: class {},
  KeyboardSensor: class {},
  pointerWithin: vi.fn(),
}));

const mockSortableState = {
  isDragging: false,
};

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: any) => <>{children}</>,
  useSortable: ({ id }: any) => ({
    attributes: { 'data-testid': `attributes-${id}` },
    listeners: { 'data-testid': `listeners-${id}` },
    setNodeRef: vi.fn(),
    transform: { x: 0, y: 10, scaleX: 1, scaleY: 1 },
    transition: 'transform 200ms ease',
    get isDragging() {
      return mockSortableState.isDragging;
    },
  }),
  sortableKeyboardCoordinates: vi.fn(),
  verticalListSortingStrategy: {},
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: (t: any) => (t ? 'translate3d(0px, 10px, 0px)' : ''),
    },
  },
}));

describe('PlaylistEditTrackList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSortableState.isDragging = false;
    mockDraft.orderedTrackRows = [];
    mockDraft.draftTrackIds = [];
  });

  it('renders placeholder message when playlist is empty', () => {
    customRender(<PlaylistEditTrackList />);

    expect(screen.getByText('No tracks in this playlist yet.')).toBeInTheDocument();
    expect(screen.queryByText('Tracks')).not.toBeInTheDocument();
  });

  it('renders track list headers and rows when playlist has tracks', () => {
    mockDraft.draftTrackIds = ['track-1', 'track-2'];
    mockDraft.orderedTrackRows = [
      {
        track: {
          id: 'track-1',
          title: 'Track One',
          duration: 180,
          explicit: false,
          artists: [{ name: 'Artist A' }],
          album: { cover: { url: 'https://example.com/cover1.jpg' } },
          audioFiles: [{ status: 'ready' }],
        },
      },
      {
        track: {
          id: 'track-2',
          title: 'Track Two',
          duration: 210,
          explicit: true,
          artists: [{ name: 'Artist B' }],
          album: null,
          audioFiles: null,
        },
      },
    ];

    const { container } = customRender(<PlaylistEditTrackList />);

    expect(screen.getByText('Tracks')).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();

    // Verify track cards
    expect(screen.getByTestId('song-card-track-1')).toBeInTheDocument();
    expect(screen.getByText('Track One')).toBeInTheDocument();
    expect(screen.getByText('Artist A')).toBeInTheDocument();
    expect(screen.getByText('180s')).toBeInTheDocument();

    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/cover1.jpg');

    expect(screen.getByTestId('song-card-track-2')).toBeInTheDocument();
    expect(screen.getByText('Track Two')).toBeInTheDocument();
  });

  it('correctly maps audio status pending/processing to isProcessing: true', () => {
    mockDraft.draftTrackIds = ['track-1'];
    mockDraft.orderedTrackRows = [
      {
        track: {
          id: 'track-1',
          title: 'Processing Track',
          duration: 150,
          explicit: false,
          artists: [],
          album: null,
          audioFiles: [{ status: 'processing' }],
        },
      },
    ];

    customRender(<PlaylistEditTrackList />);
    expect(screen.getByText('Processing')).toBeInTheDocument();
  });

  it('correctly maps audio status failed to isFailed: true', () => {
    mockDraft.draftTrackIds = ['track-1'];
    mockDraft.orderedTrackRows = [
      {
        track: {
          id: 'track-1',
          title: 'Failed Track',
          duration: 150,
          explicit: false,
          artists: [],
          album: null,
          audioFiles: [{ status: 'failed' }],
        },
      },
    ];

    customRender(<PlaylistEditTrackList />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('triggers reorderTracksFromDragEnd when drag-and-drop ends', () => {
    mockDraft.draftTrackIds = ['track-1', 'track-2'];
    mockDraft.orderedTrackRows = [
      {
        track: {
          id: 'track-1',
          title: 'Track One',
          artists: [],
        },
      },
      {
        track: {
          id: 'track-2',
          title: 'Track Two',
          artists: [],
        },
      },
    ];

    customRender(<PlaylistEditTrackList />);

    const dragEndBtn = screen.getByTestId('mock-drag-end-trigger');
    fireEvent.click(dragEndBtn);

    expect(reorderTracksFromDragEndMock).toHaveBeenCalledWith({
      active: { id: 'track-1' },
      over: { id: 'track-2' },
    });
  });

  it('applies lower opacity dragging style when a row is being dragged', () => {
    mockDraft.draftTrackIds = ['track-1'];
    mockDraft.orderedTrackRows = [
      {
        track: {
          id: 'track-1',
          title: 'Dragging Track',
          artists: [],
        },
      },
    ];

    mockSortableState.isDragging = true;

    const { container } = customRender(<PlaylistEditTrackList />);

    // Get the outer row container (which gets the ref={setNodeRef} and style)
    // The wrapper has classNamecn('flex items-stretch gap-1 rounded-xl')
    const rowEl = container.querySelector('.flex.items-stretch.gap-1.rounded-xl') as HTMLElement;
    expect(rowEl).toBeInTheDocument();
    expect(rowEl.style.opacity).toBe('0.55');
  });
});
