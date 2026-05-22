import { customRender } from '@repo/testing/web';
import { fireEvent, screen } from '@testing-library/react';
import type { DragEndEvent } from '@dnd-kit/core';
import type { Transform } from '@dnd-kit/utilities';
import {
  albumBuilder,
  artistBuilder,
  audioFileBuilder,
  imageBuilder,
  trackBuilder,
} from '@repo/testing';
import { ProcessingStatus, Visibility } from '@repo/db';
import type { ZodAlbum, ZodArtist, ZodAudioFile, ZodTrack } from '@repo/contracts';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlaylistEditTrackList } from './PlaylistEditTrackList';
import type { LibraryPlaylistTrackRow } from './playlist-edit-draft.context';

const reorderTracksFromDragEndMock = vi.fn();
const mockDraft: {
  orderedTrackRows: LibraryPlaylistTrackRow[];
  draftTrackIds: string[];
  reorderTracksFromDragEnd: typeof reorderTracksFromDragEndMock;
} = {
  orderedTrackRows: [],
  draftTrackIds: [],
  reorderTracksFromDragEnd: reorderTracksFromDragEndMock,
};

type SongCardMockProps = {
  id: string;
  trackNumber: number;
  title: string;
  artists?: Pick<ZodArtist, 'id' | 'name'>[];
  duration: number;
  explicit?: boolean;
  isProcessing?: boolean;
  isFailed?: boolean;
  artworkUrl?: string | null;
};

const PLAYLIST_ROW_ADDED_AT = new Date('2020-01-01T00:00:00.000Z');

function playlistTrackRow(track: ZodTrack): LibraryPlaylistTrackRow {
  return { addedAt: PLAYLIST_ROW_ADDED_AT, track };
}

function testTrack(
  overrides: Partial<Parameters<typeof trackBuilder>[0]> & {
    id: string;
    title: string;
    duration: number;
  },
): ZodTrack {
  return trackBuilder({
    albumId: 'album-test',
    visibility: Visibility.public,
    explicit: false,
    ...overrides,
  });
}

function testArtist(
  overrides: Partial<Parameters<typeof artistBuilder>[0]> & { name: string },
): ZodArtist {
  return artistBuilder(overrides);
}

function albumWithCoverUrl(url: string): ZodAlbum {
  return {
    ...albumBuilder({ id: 'album-with-cover', name: 'Album' }),
    cover: imageBuilder({ url }),
  };
}

function audioForTrack(trackId: string, status: ProcessingStatus): ZodAudioFile {
  return audioFileBuilder({ trackId, status });
}

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
  }: SongCardMockProps) => (
    <div data-testid={`song-card-${id}`}>
      <span>#{trackNumber}</span>
      <span>{title}</span>
      <span>{(artists ?? []).map((a) => a.name).join(', ')}</span>
      <span>{duration}s</span>
      {isProcessing && <span>Processing</span>}
      {isFailed && <span>Failed</span>}
      {artworkUrl && <img src={artworkUrl} alt={title} />}
    </div>
  ),
}));

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({
    children,
    onDragEnd,
  }: PropsWithChildren<{ onDragEnd?: (event: DragEndEvent) => void }>) => (
    <div data-testid="mock-dnd-context">
      <button
        type="button"
        data-testid="mock-drag-end-trigger"
        onClick={() =>
          onDragEnd?.({
            active: { id: 'track-1' },
            over: { id: 'track-2' },
          } as DragEndEvent)
        }
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
  SortableContext: ({ children }: PropsWithChildren) => <>{children}</>,
  useSortable: ({ id }: { id: string }) => ({
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
      toString: (t: Transform | null) => (t ? 'translate3d(0px, 10px, 0px)' : ''),
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
      playlistTrackRow({
        ...testTrack({
          id: 'track-1',
          title: 'Track One',
          duration: 180,
          explicit: false,
        }),
        artists: [testArtist({ name: 'Artist A' })],
        album: albumWithCoverUrl('https://example.com/cover1.jpg'),
        audioFiles: [audioForTrack('track-1', ProcessingStatus.complete)],
      }),
      playlistTrackRow({
        ...testTrack({
          id: 'track-2',
          title: 'Track Two',
          duration: 210,
          explicit: true,
        }),
        artists: [testArtist({ name: 'Artist B' })],
        album: undefined,
        audioFiles: undefined,
      }),
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
      playlistTrackRow({
        ...testTrack({
          id: 'track-1',
          title: 'Processing Track',
          duration: 150,
          explicit: false,
        }),
        artists: [],
        album: undefined,
        audioFiles: [audioForTrack('track-1', ProcessingStatus.processing)],
      }),
    ];

    customRender(<PlaylistEditTrackList />);
    expect(screen.getByText('Processing')).toBeInTheDocument();
  });

  it('correctly maps audio status failed to isFailed: true', () => {
    mockDraft.draftTrackIds = ['track-1'];
    mockDraft.orderedTrackRows = [
      playlistTrackRow({
        ...testTrack({
          id: 'track-1',
          title: 'Failed Track',
          duration: 150,
          explicit: false,
        }),
        artists: [],
        album: undefined,
        audioFiles: [audioForTrack('track-1', ProcessingStatus.failed)],
      }),
    ];

    customRender(<PlaylistEditTrackList />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('triggers reorderTracksFromDragEnd when drag-and-drop ends', () => {
    mockDraft.draftTrackIds = ['track-1', 'track-2'];
    mockDraft.orderedTrackRows = [
      playlistTrackRow({
        ...testTrack({ id: 'track-1', title: 'Track One', duration: 180 }),
        artists: [],
      }),
      playlistTrackRow({
        ...testTrack({ id: 'track-2', title: 'Track Two', duration: 200 }),
        artists: [],
      }),
    ];

    customRender(<PlaylistEditTrackList />);

    const dragEndBtn = screen.getByTestId('mock-drag-end-trigger');
    fireEvent.click(dragEndBtn);

    expect(reorderTracksFromDragEndMock).toHaveBeenCalledWith(
      expect.objectContaining({
        active: expect.objectContaining({ id: 'track-1' }),
        over: expect.objectContaining({ id: 'track-2' }),
      }),
    );
  });

  it('applies lower opacity dragging style when a row is being dragged', () => {
    mockDraft.draftTrackIds = ['track-1'];
    mockDraft.orderedTrackRows = [
      playlistTrackRow({
        ...testTrack({ id: 'track-1', title: 'Dragging Track', duration: 120 }),
        artists: [],
      }),
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
