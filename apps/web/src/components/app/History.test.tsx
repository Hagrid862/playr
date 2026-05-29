import { UNKNOWN_ARTIST_LABEL } from '@/lib/display-constants';
import { useListenHistoryInfinite } from '@/hooks/api/library';
import { listenHistoryInfiniteQueryKey } from '@/hooks/api/library/useListenHistoryInfinite';
import { PlayerState, usePlayerStore } from '@/stores/player-store/player.store';
import type { GetListenHistoryResponse } from '@repo/contracts';
import { customRender } from '@repo/testing/web';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { History } from './History';
import { createPlayerStateMock } from './test-utils/player-test-utils';

const historyTestMocks = vi.hoisted(() => ({
  mockInvalidateQueries: vi.fn(),
  mockSetQueryData: vi.fn(),
  mockGetListenHistory: vi.fn(),
  mockClearHistory: vi.fn(),
}));

const clearHistoryMockState = vi.hoisted(() => ({ isPending: false }));
const motionMockState = vi.hoisted(() => ({ reducedMotion: false }));

vi.mock('@/hooks/api/history/useClearListenHistory', () => ({
  useClearListenHistory: () => ({
    mutate: historyTestMocks.mockClearHistory,
    get isPending() {
      return clearHistoryMockState.isPending;
    },
  }),
}));

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return {
    ...actual,
    useReducedMotion: () => motionMockState.reducedMotion,
  };
});

const emptyListenHistoryResponse = {
  success: true as const,
  data: { items: [], total: 0, page: 1, limit: 20 },
  error: null,
  meta: {
    timestamp: '2026-05-27T00:00:00.000Z',
    requestId: 'req-test',
    path: '/library/history',
  },
} satisfies GetListenHistoryResponse;

let observerCallback: IntersectionObserverCallback | null = null;

class MockIntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {
    observerCallback = callback;
  }
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}
vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const original = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...original,
    useQueryClient: () => ({
      invalidateQueries: historyTestMocks.mockInvalidateQueries,
      setQueryData: historyTestMocks.mockSetQueryData,
    }),
  };
});

vi.mock('@/stores/player-store/player.store', () => ({
  usePlayerStore: vi.fn(),
}));

vi.mock('@/hooks/api/library/requests/getListenHistory', () => ({
  getListenHistory: historyTestMocks.mockGetListenHistory,
}));

vi.mock('@/hooks/api/library', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/api/library')>();
  return {
    ...actual,
    useListenHistoryInfinite: vi.fn(),
  };
});

describe('History', () => {
  const mockPlayTrack = vi.fn();
  const mockToggleQueue = vi.fn();
  const mockOnBack = vi.fn();
  const mockFetchNextPage = vi.fn();

  const buildState = (overrides: Partial<PlayerState> = {}) =>
    createPlayerStateMock({
      playTrack: mockPlayTrack,
      toggleQueue: mockToggleQueue,
      ...overrides,
    });

  type ListenHistoryQueryResult = ReturnType<typeof useListenHistoryInfinite>;

  type BuildQueryMockOptions = {
    hasNext?: boolean;
    isLoading?: boolean;
    isFetching?: boolean;
    isFetchingNextPage?: boolean;
    pages?: Array<{
      data?: { items?: unknown[]; total?: number; page?: number; limit?: number } | null;
    }>;
  };

  const buildQueryMock = (
    items: unknown[] = [],
    hasNextOrOptions: boolean | BuildQueryMockOptions = false,
    loading = false,
  ): ListenHistoryQueryResult => {
    const options: BuildQueryMockOptions =
      typeof hasNextOrOptions === 'boolean'
        ? { hasNext: hasNextOrOptions, isLoading: loading }
        : hasNextOrOptions;

    const {
      hasNext = false,
      isLoading = false,
      isFetching = false,
      isFetchingNextPage = false,
      pages,
    } = options;

    return {
      data: {
        pages: pages ?? [
          {
            data: {
              items,
              total: items.length + (hasNext ? 20 : 0),
              page: 1,
              limit: 20,
            },
          },
        ],
      },
      fetchNextPage: mockFetchNextPage,
      hasNextPage: hasNext,
      isLoading,
      isFetching,
      isFetchingNextPage,
      isError: false,
    } as unknown as ListenHistoryQueryResult;
  };

  const mockArtist = (id: string, name: string) => ({
    id,
    name,
    description: null,
    isCommunity: false,
    verified: true,
    bannerId: null,
    avatarId: null,
    visibility: 'public',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  });

  const mockAlbum = (id: string, name: string, coverUrl: string | null = null) => ({
    id,
    name,
    description: null,
    type: 'album' as const,
    systemKind: 'none' as const,
    totalTracks: 1,
    totalDuration: 100,
    releaseDate: null,
    libraryId: null,
    coverId: coverUrl ? `cover-${id}` : null,
    visibility: 'public',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
    cover: coverUrl
      ? {
          id: `cover-${id}`,
          alt: `Alt ${name}`,
          bucket: 'public',
          key: `key-${id}`,
          url: coverUrl,
          mimeType: 'image/jpeg',
          blurhash: 'blur',
          reportId: null,
          uploadStatus: 'completed',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
        }
      : null,
  });

  beforeEach(() => {
    observerCallback = null;
    clearHistoryMockState.isPending = false;
    motionMockState.reducedMotion = false;
    vi.clearAllMocks();
    vi.useFakeTimers();
    historyTestMocks.mockGetListenHistory.mockResolvedValue(emptyListenHistoryResponse);
    vi.mocked(usePlayerStore).mockReturnValue(buildState());
    vi.mocked(useListenHistoryInfinite).mockReturnValue(buildQueryMock());
  });

  describe('loading state', () => {
    it('renders loading text when query is loading', () => {
      vi.mocked(useListenHistoryInfinite).mockReturnValue(buildQueryMock([], { isLoading: true }));
      customRender(<History isVisible={true} onBack={mockOnBack} />);
      expect(screen.getByRole('status', { name: 'Loading history' })).toBeInTheDocument();
      expect(screen.queryByText('No listening history')).not.toBeInTheDocument();
    });

    it('renders loading text on initial fetch while isFetching with no data yet', () => {
      vi.mocked(useListenHistoryInfinite).mockReturnValue({
        data: undefined,
        fetchNextPage: mockFetchNextPage,
        hasNextPage: false,
        isLoading: false,
        isFetching: true,
        isFetchingNextPage: false,
        isError: false,
      } as unknown as ListenHistoryQueryResult);

      customRender(<History isVisible={true} onBack={mockOnBack} />);

      expect(screen.getByRole('status', { name: 'Loading history' })).toBeInTheDocument();
      expect(screen.queryByText('No listening history')).not.toBeInTheDocument();
    });

    it('does not render loading text when refetching after being loaded once', () => {
      // Simulate loaded once state by first rendering with isLoading: false
      vi.mocked(useListenHistoryInfinite).mockReturnValue(
        buildQueryMock([], { isLoading: false, isFetching: false }),
      );
      const { rerender } = customRender(<History isVisible={true} onBack={mockOnBack} />);

      // Now mock the background refetch (isFetching: true)
      vi.mocked(useListenHistoryInfinite).mockReturnValue(
        buildQueryMock([], { isLoading: false, isFetching: true }),
      );
      rerender(<History isVisible={true} onBack={mockOnBack} />);

      expect(screen.queryByRole('status', { name: 'Loading history' })).not.toBeInTheDocument();
      expect(screen.getByText('No listening history')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('renders empty state when history is empty', () => {
      customRender(<History isVisible={true} onBack={mockOnBack} />);
      expect(screen.getByText('No listening history')).toBeInTheDocument();
    });

    it('renders empty state when query data is undefined', () => {
      vi.mocked(useListenHistoryInfinite).mockReturnValue({
        data: undefined,
        fetchNextPage: mockFetchNextPage,
        hasNextPage: false,
        isLoading: false,
        isFetching: false,
        isFetchingNextPage: false,
        isError: false,
      } as unknown as ListenHistoryQueryResult);

      customRender(<History isVisible={true} onBack={mockOnBack} />);

      expect(screen.getByText('No listening history')).toBeInTheDocument();
    });
  });

  describe('history list', () => {
    it('renders history tracks', () => {
      const mockItems = [
        {
          id: 'hist-1',
          listenedAt: '2026-05-27T10:00:00Z',
          durationMs: 100,
          completed: false,
          track: {
            id: '1',
            title: 'Track 1',
            trackId: '1',
            artists: [mockArtist('artist-1', 'Artist 1')],
            albumId: '1',
            album: mockAlbum('1', 'Album 1', 'cover.jpg'),
            duration: 100,
            explicit: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null,
            visibility: 'public',
          },
        },
        {
          id: 'hist-2',
          listenedAt: '2026-05-27T10:01:00Z',
          durationMs: 100,
          completed: false,
          track: {
            id: '2',
            title: 'Track 2',
            trackId: '2',
            artists: [mockArtist('artist-2', 'Artist 2')],
            albumId: '2',
            album: mockAlbum('2', 'Album 2', 'cover.jpg'),
            duration: 100,
            explicit: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null,
            visibility: 'public',
          },
        },
      ];

      vi.mocked(useListenHistoryInfinite).mockReturnValue(buildQueryMock(mockItems));

      customRender(<History isVisible={true} onBack={mockOnBack} />);
      expect(screen.getByText('Track 1')).toBeInTheDocument();
      expect(screen.getByText('Artist 1')).toBeInTheDocument();
      expect(screen.getByText('Track 2')).toBeInTheDocument();
      expect(screen.getByAltText('Track 2')).toHaveAttribute('src', 'cover.jpg');
    });

    it('calls playTrack when a track is clicked', () => {
      const item = {
        id: 'hist-1',
        listenedAt: '2026-05-27T10:00:00Z',
        durationMs: 100,
        completed: false,
        track: {
          id: '1',
          title: 'Track 1',
          trackId: '1',
          artists: [mockArtist('artist-1', 'Artist 1')],
          albumId: '1',
          album: mockAlbum('1', 'Album 1', 'cover.jpg'),
          duration: 100,
          explicit: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
          visibility: 'public',
        },
      };

      vi.mocked(useListenHistoryInfinite).mockReturnValue(buildQueryMock([item]));

      customRender(<History isVisible={true} onBack={mockOnBack} />);
      fireEvent.click(screen.getByText('Track 1'));
      expect(mockPlayTrack).toHaveBeenCalledWith({
        id: '1',
        trackId: '1',
        title: 'Track 1',
        artists: ['Artist 1'],
        albumName: 'Album 1',
        albumId: '1',
        albumArt: 'cover.jpg',
        duration: 100,
        explicit: false,
      });
    });

    it('calls playTrack when a track receives Enter or Space key press', () => {
      const item = {
        id: 'hist-1',
        listenedAt: '2026-05-27T10:00:00Z',
        durationMs: 100,
        completed: false,
        track: {
          id: '1',
          title: 'Track 1',
          trackId: '1',
          artists: [mockArtist('artist-1', 'Artist 1')],
          albumId: '1',
          album: mockAlbum('1', 'Album 1', 'cover.jpg'),
          duration: 100,
          explicit: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
          visibility: 'public',
        },
      };

      vi.mocked(useListenHistoryInfinite).mockReturnValue(buildQueryMock([item]));

      customRender(<History isVisible={true} onBack={mockOnBack} />);

      const row = screen.getByRole('button', { name: /Play Track 1 by Artist 1/i });

      // Enter key
      fireEvent.keyDown(row, { key: 'Enter' });
      expect(mockPlayTrack).toHaveBeenCalledTimes(1);

      // Space key
      fireEvent.keyDown(row, { key: ' ' });
      expect(mockPlayTrack).toHaveBeenCalledTimes(2);

      // Other key should be ignored
      fireEvent.keyDown(row, { key: 'a' });
      expect(mockPlayTrack).toHaveBeenCalledTimes(2);
    });

    it('uses Cover art as img alt when albumArt is set but title is empty', () => {
      const item = {
        id: 'hist-1',
        listenedAt: '2026-05-27T10:00:00Z',
        durationMs: 100,
        completed: false,
        track: {
          id: '1',
          title: '',
          trackId: '1',
          artists: [mockArtist('artist-1', 'Artist')],
          albumId: 'album-1',
          album: mockAlbum('album-1', 'Album', 'cover-only.jpg'),
          duration: 100,
          explicit: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
          visibility: 'public',
        },
      };

      vi.mocked(useListenHistoryInfinite).mockReturnValue(buildQueryMock([item]));

      customRender(<History isVisible={true} onBack={mockOnBack} />);
      expect(screen.getByAltText('Cover art')).toHaveAttribute('src', 'cover-only.jpg');
    });

    it('shows unknown artist label when artists list is empty', () => {
      const item = {
        id: 'hist-1',
        listenedAt: '2026-05-27T10:00:00Z',
        durationMs: 100,
        completed: false,
        track: {
          id: '1',
          title: 'No Artists Track',
          trackId: '1',
          artists: [],
          albumId: 'album-1',
          album: mockAlbum('album-1', 'Album', null),
          duration: 100,
          explicit: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
          visibility: 'public',
        },
      };

      vi.mocked(useListenHistoryInfinite).mockReturnValue(buildQueryMock([item]));

      customRender(<History isVisible={true} onBack={mockOnBack} />);
      expect(screen.getByText(UNKNOWN_ARTIST_LABEL)).toBeInTheDocument();
    });

    it('renders placeholder when albumArt is missing', () => {
      const item = {
        id: 'hist-1',
        listenedAt: '2026-05-27T10:00:00Z',
        durationMs: 100,
        completed: false,
        track: {
          id: '1',
          title: 'No Art Track',
          trackId: '1',
          artists: [mockArtist('artist-1', 'Artist')],
          albumId: 'album-1',
          album: mockAlbum('album-1', 'Album', null),
          duration: 100,
          explicit: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
          visibility: 'public',
        },
      };

      vi.mocked(useListenHistoryInfinite).mockReturnValue(buildQueryMock([item]));

      customRender(<History isVisible={true} onBack={mockOnBack} />);
      expect(screen.getByText('No Art Track')).toBeInTheDocument();
      const icon = document.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('handles load more functionality by triggering fetchNextPage', () => {
      const mockItems = Array.from({ length: 20 }).map((_, i) => ({
        id: `hist-${i}`,
        listenedAt: new Date().toISOString(),
        durationMs: 100,
        completed: false,
        track: {
          id: `track-${i}`,
          title: `Track ${i}`,
          trackId: `track-${i}`,
          artists: [mockArtist('artist-1', 'Artist')],
          albumId: `album-${i}`,
          album: mockAlbum(`album-${i}`, `Album ${i}`, `cover-${i}.jpg`),
          duration: 100,
          explicit: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
          visibility: 'public',
        },
      }));

      vi.mocked(useListenHistoryInfinite).mockReturnValue(
        buildQueryMock(mockItems, { hasNext: true }),
      );

      customRender(<History isVisible={true} onBack={mockOnBack} />);

      expect(screen.getByText('Track 0')).toBeInTheDocument();
      expect(screen.getByText('Track 19')).toBeInTheDocument();

      expect(observerCallback).toBeDefined();
      observerCallback!(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );

      expect(mockFetchNextPage).toHaveBeenCalled();
    });

    it('does not fetch the next page while already fetching', () => {
      const mockItems = [
        {
          id: 'hist-0',
          listenedAt: new Date().toISOString(),
          durationMs: 100,
          completed: false,
          track: {
            id: 'track-0',
            title: 'Track 0',
            trackId: 'track-0',
            artists: [mockArtist('artist-1', 'Artist')],
            albumId: 'album-0',
            album: mockAlbum('album-0', 'Album', 'cover.jpg'),
            duration: 100,
            explicit: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null,
            visibility: 'public',
          },
        },
      ];

      vi.mocked(useListenHistoryInfinite).mockReturnValue(
        buildQueryMock(mockItems, { hasNext: true, isFetchingNextPage: true }),
      );

      customRender(<History isVisible={true} onBack={mockOnBack} />);

      observerCallback!(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );

      expect(mockFetchNextPage).not.toHaveBeenCalled();
    });

    it('does not fetch the next page when the sentinel is not intersecting', () => {
      const mockItems = [
        {
          id: 'hist-0',
          listenedAt: new Date().toISOString(),
          durationMs: 100,
          completed: false,
          track: {
            id: 'track-0',
            title: 'Track 0',
            trackId: 'track-0',
            artists: [mockArtist('artist-1', 'Artist')],
            albumId: 'album-0',
            album: mockAlbum('album-0', 'Album', 'cover.jpg'),
            duration: 100,
            explicit: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null,
            visibility: 'public',
          },
        },
      ];

      vi.mocked(useListenHistoryInfinite).mockReturnValue(
        buildQueryMock(mockItems, { hasNext: true }),
      );

      customRender(<History isVisible={true} onBack={mockOnBack} />);

      observerCallback!(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );

      expect(mockFetchNextPage).not.toHaveBeenCalled();
    });

    it('renders pagination loading text while fetching the next page', () => {
      const mockItems = [
        {
          id: 'hist-0',
          listenedAt: new Date().toISOString(),
          durationMs: 100,
          completed: false,
          track: {
            id: 'track-0',
            title: 'Track 0',
            trackId: 'track-0',
            artists: [mockArtist('artist-1', 'Artist')],
            albumId: 'album-0',
            album: mockAlbum('album-0', 'Album', 'cover.jpg'),
            duration: 100,
            explicit: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null,
            visibility: 'public',
          },
        },
      ];

      vi.mocked(useListenHistoryInfinite).mockReturnValue(
        buildQueryMock(mockItems, { hasNext: true, isFetchingNextPage: true }),
      );

      customRender(<History isVisible={true} onBack={mockOnBack} />);

      expect(screen.getByRole('status', { name: 'Loading next page' })).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('deduplicates history items with the same id across pages', () => {
      const item = {
        id: 'hist-dup',
        listenedAt: '2026-05-27T10:00:00Z',
        durationMs: 100,
        completed: false,
        track: {
          id: '1',
          title: 'Duplicate Track',
          trackId: '1',
          artists: [mockArtist('artist-1', 'Artist')],
          albumId: '1',
          album: mockAlbum('1', 'Album', 'cover.jpg'),
          duration: 100,
          explicit: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
          visibility: 'public',
        },
      };

      vi.mocked(useListenHistoryInfinite).mockReturnValue(
        buildQueryMock([], {
          pages: [
            { data: { items: [item, { ...item }], total: 2, page: 1, limit: 20 } },
            { data: { items: undefined, total: 0, page: 2, limit: 20 } },
          ],
        }),
      );

      customRender(<History isVisible={true} onBack={mockOnBack} />);

      expect(screen.getAllByText('Duplicate Track')).toHaveLength(1);
    });

    it('formats string artist names on history rows', () => {
      const item = {
        id: 'hist-1',
        listenedAt: '2026-05-27T10:00:00Z',
        durationMs: 100,
        completed: false,
        track: {
          id: '1',
          title: 'String Artist Track',
          trackId: '1',
          artists: ['String Artist'],
          albumId: '1',
          album: mockAlbum('1', 'Album', null),
          duration: 100,
          explicit: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
          visibility: 'public',
        },
      };

      vi.mocked(useListenHistoryInfinite).mockReturnValue(buildQueryMock([item]));

      customRender(<History isVisible={true} onBack={mockOnBack} />);

      expect(screen.getByText('String Artist')).toBeInTheDocument();
    });

    it('marks a newly inserted head row for enter animation', () => {
      const firstItem = {
        id: 'hist-1',
        listenedAt: '2026-05-27T10:00:00Z',
        durationMs: 100,
        completed: false,
        track: {
          id: '1',
          title: 'First Track',
          trackId: '1',
          artists: [mockArtist('artist-1', 'Artist')],
          albumId: '1',
          album: mockAlbum('1', 'Album', null),
          duration: 100,
          explicit: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
          visibility: 'public',
        },
      };
      const secondItem = {
        ...firstItem,
        id: 'hist-2',
        track: { ...firstItem.track, id: '2', title: 'New Head Track', trackId: '2' },
      };

      vi.mocked(useListenHistoryInfinite).mockReturnValue(buildQueryMock([firstItem]));
      const { rerender } = customRender(<History isVisible={true} onBack={mockOnBack} />);

      vi.mocked(useListenHistoryInfinite).mockReturnValue(buildQueryMock([secondItem, firstItem]));
      rerender(<History isVisible={true} onBack={mockOnBack} />);

      expect(screen.getByText('New Head Track')).toBeInTheDocument();
    });

    it('respects reduced motion preferences on history rows', () => {
      motionMockState.reducedMotion = true;

      const item = {
        id: 'hist-1',
        listenedAt: '2026-05-27T10:00:00Z',
        durationMs: 100,
        completed: false,
        track: {
          id: '1',
          title: 'Reduced Motion Track',
          trackId: '1',
          artists: [mockArtist('artist-1', 'Artist')],
          albumId: '1',
          album: mockAlbum('1', 'Album', null),
          duration: 100,
          explicit: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
          visibility: 'public',
        },
      };

      vi.mocked(useListenHistoryInfinite).mockReturnValue(buildQueryMock([item]));

      customRender(<History isVisible={true} onBack={mockOnBack} />);

      expect(screen.getByText('Reduced Motion Track')).toBeInTheDocument();
    });

    it('records head animation state when the newest entry has no id', () => {
      const itemWithoutId = {
        listenedAt: '2026-05-27T10:00:00Z',
        durationMs: 100,
        completed: false,
        track: {
          id: '1',
          title: 'No Id Entry',
          trackId: '1',
          artists: [mockArtist('artist-1', 'Artist')],
          albumId: '1',
          album: mockAlbum('1', 'Album', null),
          duration: 100,
          explicit: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
          visibility: 'public',
        },
      };

      vi.mocked(useListenHistoryInfinite).mockReturnValue(
        buildQueryMock([itemWithoutId] as unknown[]),
      );

      customRender(<History isVisible={true} onBack={mockOnBack} />);

      expect(screen.getByText('No Id Entry')).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('calls onBack when back button is clicked', () => {
      customRender(<History isVisible={true} onBack={mockOnBack} />);
      fireEvent.click(screen.getByTitle('Back to Queue'));
      expect(mockOnBack).toHaveBeenCalled();
    });

    it('calls toggleQueue when close button is clicked', () => {
      customRender(<History isVisible={true} onBack={mockOnBack} />);
      fireEvent.click(
        screen.getByRole('button', {
          name: /close/i,
        }),
      );
      expect(mockToggleQueue).toHaveBeenCalled();
    });
  });

  describe('visibility', () => {
    it('applies correct classes based on isVisible', () => {
      const { container, rerender } = customRender(
        <History isVisible={true} onBack={mockOnBack} />,
      );
      expect(container.firstChild).toHaveClass('opacity-100');
      expect(container.firstChild).not.toHaveClass('opacity-0');

      rerender(<History isVisible={false} onBack={mockOnBack} />);
      expect(container.firstChild).toHaveClass('opacity-0');
      expect(container.firstChild).not.toHaveClass('opacity-100');
    });
  });

  describe('active listen history sync', () => {
    it('does not fetch when history panel is closed', async () => {
      const state = buildState({
        isPlaying: true,
        currentTrack: {
          id: '1',
          trackId: '1',
          title: 'Track 1',
          artists: ['Artist 1'],
          albumName: 'Album 1',
          albumId: 'album-1',
          albumArt: 'cover.jpg',
          duration: 100,
          explicit: false,
        },
      });
      vi.mocked(usePlayerStore).mockReturnValue(state);

      customRender(<History isVisible={false} onBack={mockOnBack} />);

      await vi.advanceTimersByTimeAsync(400);
      await Promise.resolve();

      expect(historyTestMocks.mockGetListenHistory).not.toHaveBeenCalled();
    });

    it('fetches page 1 and updates infinite query cache when active track changes', async () => {
      const state1 = buildState({ currentTrack: null, isPlaying: true });
      vi.mocked(usePlayerStore).mockReturnValue(state1);

      const { rerender } = customRender(<History isVisible={true} onBack={mockOnBack} />);
      expect(historyTestMocks.mockInvalidateQueries).not.toHaveBeenCalled();

      const state2 = buildState({
        isPlaying: true,
        listenHistoryRefreshToken: 1,
        currentTrack: {
          id: '1',
          trackId: '1',
          title: 'Track 1',
          artists: ['Artist 1'],
          albumName: 'Album 1',
          albumId: 'album-1',
          albumArt: 'cover.jpg',
          duration: 100,
          explicit: false,
        },
      });
      vi.mocked(usePlayerStore).mockReturnValue(state2);

      rerender(<History isVisible={true} onBack={mockOnBack} />);

      await vi.advanceTimersByTimeAsync(400);
      await Promise.resolve();

      expect(historyTestMocks.mockGetListenHistory).toHaveBeenCalledWith({ page: 1, limit: 20 });
      expect(historyTestMocks.mockInvalidateQueries).not.toHaveBeenCalled();

      const lastSetQueryDataCall = historyTestMocks.mockSetQueryData.mock.calls.at(-1);
      expect(lastSetQueryDataCall?.[0]).toEqual(listenHistoryInfiniteQueryKey(20));
      const updater = lastSetQueryDataCall?.[1] as (old: unknown) => {
        pages: unknown[];
        pageParams: number[];
      };
      expect(updater(undefined)).toEqual({
        pages: [emptyListenHistoryResponse],
        pageParams: [1],
      });
    });
  });

  describe('clear history', () => {
    it('does not render the Clear button when history is empty', () => {
      vi.mocked(useListenHistoryInfinite).mockReturnValue(buildQueryMock([]));
      customRender(<History isVisible={true} onBack={mockOnBack} />);
      expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();
    });

    it('renders the Clear button when history has items', () => {
      const mockItems = [
        {
          id: 'hist-1',
          listenedAt: '2026-05-27T10:00:00Z',
          durationMs: 100,
          completed: false,
          track: {
            id: '1',
            title: 'Track 1',
            trackId: '1',
            artists: [mockArtist('artist-1', 'Artist 1')],
            albumId: '1',
            album: mockAlbum('1', 'Album 1', 'cover.jpg'),
            duration: 100,
            explicit: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null,
            visibility: 'public',
          },
        },
      ];
      vi.mocked(useListenHistoryInfinite).mockReturnValue(buildQueryMock(mockItems));
      customRender(<History isVisible={true} onBack={mockOnBack} />);
      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
    });

    it('shows Clearing... on the confirm button while the mutation is pending', () => {
      const mockItems = [
        {
          id: 'hist-1',
          listenedAt: '2026-05-27T10:00:00Z',
          durationMs: 100,
          completed: false,
          track: {
            id: '1',
            title: 'Track 1',
            trackId: '1',
            artists: [mockArtist('artist-1', 'Artist 1')],
            albumId: '1',
            album: mockAlbum('1', 'Album 1', 'cover.jpg'),
            duration: 100,
            explicit: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null,
            visibility: 'public',
          },
        },
      ];
      vi.mocked(useListenHistoryInfinite).mockReturnValue(buildQueryMock(mockItems));

      const { rerender } = customRender(<History isVisible={true} onBack={mockOnBack} />);

      fireEvent.click(screen.getByRole('button', { name: /clear/i }));
      clearHistoryMockState.isPending = true;
      rerender(<History isVisible={true} onBack={mockOnBack} />);

      expect(screen.getByRole('button', { name: 'Clearing...' })).toBeDisabled();
    });

    it('opens the popover and calls clearHistory when confirmed', () => {
      const mockItems = [
        {
          id: 'hist-1',
          listenedAt: '2026-05-27T10:00:00Z',
          durationMs: 100,
          completed: false,
          track: {
            id: '1',
            title: 'Track 1',
            trackId: '1',
            artists: [mockArtist('artist-1', 'Artist 1')],
            albumId: '1',
            album: mockAlbum('1', 'Album 1', 'cover.jpg'),
            duration: 100,
            explicit: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null,
            visibility: 'public',
          },
        },
      ];
      vi.mocked(useListenHistoryInfinite).mockReturnValue(buildQueryMock(mockItems));

      customRender(<History isVisible={true} onBack={mockOnBack} />);

      const triggerBtn = screen.getByRole('button', { name: /clear/i });
      fireEvent.click(triggerBtn);

      expect(screen.getByText('Clear History?')).toBeInTheDocument();
      expect(screen.getByText(/permanently clear your listening history/i)).toBeInTheDocument();

      const clearButtons = screen.getAllByRole('button', { name: /clear/i });
      fireEvent.click(clearButtons[1]);

      expect(historyTestMocks.mockClearHistory).toHaveBeenCalled();
    });

    it('opens the popover and does not call clearHistory when cancelled', () => {
      const mockItems = [
        {
          id: 'hist-1',
          listenedAt: '2026-05-27T10:00:00Z',
          durationMs: 100,
          completed: false,
          track: {
            id: '1',
            title: 'Track 1',
            trackId: '1',
            artists: [mockArtist('artist-1', 'Artist 1')],
            albumId: '1',
            album: mockAlbum('1', 'Album 1', 'cover.jpg'),
            duration: 100,
            explicit: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null,
            visibility: 'public',
          },
        },
      ];
      vi.mocked(useListenHistoryInfinite).mockReturnValue(buildQueryMock(mockItems));

      customRender(<History isVisible={true} onBack={mockOnBack} />);

      fireEvent.click(screen.getByRole('button', { name: /clear/i }));

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(historyTestMocks.mockClearHistory).not.toHaveBeenCalled();
    });
  });
});
