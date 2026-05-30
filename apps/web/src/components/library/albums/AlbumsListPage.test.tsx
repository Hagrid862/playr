import { useLibraryAlbumsInfinite } from '@/hooks/api/library-albums/useLibraryAlbumsInfinite';
import { UNKNOWN_ALBUM_LABEL, UNKNOWN_ARTIST_LABEL } from '@/lib/display-constants';
import type { GetLibraryAlbumsResponse, ZodAlbum } from '@repo/contracts';
import { albumBuilder, artistBuilder } from '@repo/testing';
import { customRender } from '@repo/testing/web';
import { screen, within } from '@testing-library/react';
import { AlbumSystemKind, AlbumType } from '@repo/db';
import type { InfiniteData } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AlbumsListPage } from './AlbumsListPage';

let observerCallback: IntersectionObserverCallback | null = null;

class MockIntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {
    observerCallback = callback;
  }
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

vi.mock('@/hooks/api/library-albums/useLibraryAlbumsInfinite', () => ({
  useLibraryAlbumsInfinite: vi.fn(),
}));

vi.mock('@/components/library/MediaCard', () => ({
  MediaCard: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div data-testid="media-card">
      <span>{title}</span>
      {subtitle ? <span data-testid="media-card-subtitle">{subtitle}</span> : null}
    </div>
  ),
}));

vi.mock('@/components/library/albums/AlbumLibraryContextMenu', () => ({
  AlbumLibraryContextMenu: () => null,
}));

const mockFetchNextPage = vi.fn().mockResolvedValue(undefined);

const defaultPageMeta = {
  timestamp: '2026-01-01T00:00:00.000Z',
  requestId: 'req-test',
  path: '/library/albums',
} as const;

function zodAlbum(overrides: Partial<ZodAlbum> = {}): ZodAlbum {
  return { ...albumBuilder(), ...overrides };
}

function toLibraryAlbumItem(album: ZodAlbum): GetLibraryAlbumsResponse['data']['items'][number] {
  return {
    id: `library-album-${album.id}`,
    libraryId: album.libraryId ?? 'library-test',
    albumId: album.id,
    createdAt: album.createdAt,
    updatedAt: album.updatedAt,
    deletedAt: album.deletedAt,
    album,
  };
}

function buildAlbumPage(albums: ZodAlbum[], page = 1, limit = 50): GetLibraryAlbumsResponse {
  return {
    success: true,
    data: {
      items: albums.map(toLibraryAlbumItem),
      total: albums.length,
      page,
      limit,
    },
    error: null,
    meta: defaultPageMeta,
  };
}

/** Page shape the list flattener must tolerate at runtime (missing `data`). */
type AlbumsInfinitePage =
  | GetLibraryAlbumsResponse
  | {
      success: true;
      data: undefined;
      error: null;
      meta: typeof defaultPageMeta;
    };

function buildAlbumPageMissingData(): AlbumsInfinitePage {
  return {
    success: true,
    data: undefined,
    error: null,
    meta: defaultPageMeta,
  };
}

type AlbumsInfiniteQueryFields = Pick<
  ReturnType<typeof useLibraryAlbumsInfinite>,
  'isPending' | 'hasNextPage' | 'isFetchingNextPage' | 'fetchNextPage'
> & {
  data?: InfiniteData<AlbumsInfinitePage>;
};

function asAlbumsInfiniteQueryResult(
  value: AlbumsInfiniteQueryFields,
): ReturnType<typeof useLibraryAlbumsInfinite> {
  return value as unknown as ReturnType<typeof useLibraryAlbumsInfinite>;
}

function buildInfiniteMock(
  albums: ZodAlbum[],
  options: {
    hasNext?: boolean;
    isPending?: boolean;
    isFetchingNextPage?: boolean;
    infiniteData?: InfiniteData<AlbumsInfinitePage>;
  } = {},
): ReturnType<typeof useLibraryAlbumsInfinite> {
  return asAlbumsInfiniteQueryResult({
    data:
      options.infiniteData ??
      ({
        pages: [buildAlbumPage(albums)],
        pageParams: [1],
      } satisfies InfiniteData<AlbumsInfinitePage>),
    isPending: options.isPending ?? false,
    hasNextPage: options.hasNext ?? false,
    isFetchingNextPage: options.isFetchingNextPage ?? false,
    fetchNextPage: mockFetchNextPage,
  });
}

describe('AlbumsListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    observerCallback = null;
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  it('renders albums from infinite query pages', () => {
    vi.mocked(useLibraryAlbumsInfinite).mockReturnValue(
      buildInfiniteMock([zodAlbum({ name: 'First Album' })]),
    );

    customRender(<AlbumsListPage />);

    expect(screen.getByText('First Album')).toBeInTheDocument();
  });

  it('fetches the next page when the sentinel intersects', () => {
    vi.mocked(useLibraryAlbumsInfinite).mockReturnValue(
      buildInfiniteMock([zodAlbum({ name: 'First Album' })], { hasNext: true }),
    );

    customRender(<AlbumsListPage />);

    expect(observerCallback).toBeDefined();
    observerCallback!(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );

    expect(mockFetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('renders a loading state while albums are pending', () => {
    vi.mocked(useLibraryAlbumsInfinite).mockReturnValue(buildInfiniteMock([], { isPending: true }));

    customRender(<AlbumsListPage />);

    expect(screen.getByText('Fetching your albums...')).toBeInTheDocument();
  });

  it('renders an empty state when there are no albums', () => {
    vi.mocked(useLibraryAlbumsInfinite).mockReturnValue(buildInfiniteMock([]));

    customRender(<AlbumsListPage />);

    expect(screen.getByText('No albums found')).toBeInTheDocument();
    expect(screen.getByText(/Your private library is empty/i)).toBeInTheDocument();
  });

  it('renders an empty state when query pages are empty', () => {
    vi.mocked(useLibraryAlbumsInfinite).mockReturnValue(
      buildInfiniteMock([], {
        infiniteData: { pages: [], pageParams: [] },
      }),
    );

    customRender(<AlbumsListPage />);

    expect(screen.getByText('No albums found')).toBeInTheDocument();
  });

  it('flattens albums from multiple pages and skips missing album payloads', () => {
    const firstAlbum = zodAlbum({ name: 'Page One Album' });
    const secondAlbum = zodAlbum({ name: 'Page Two Album' });

    vi.mocked(useLibraryAlbumsInfinite).mockReturnValue(
      buildInfiniteMock([], {
        infiniteData: {
          pages: [
            {
              ...buildAlbumPage([firstAlbum]),
              data: {
                items: [
                  toLibraryAlbumItem(firstAlbum),
                  { ...toLibraryAlbumItem(firstAlbum), album: undefined },
                ],
                total: 2,
                page: 1,
                limit: 50,
              },
            },
            buildAlbumPageMissingData(),
            buildAlbumPage([secondAlbum], 2),
          ],
          pageParams: [1, 2, 3],
        },
      }),
    );

    customRender(<AlbumsListPage />);

    expect(screen.getByText('Page One Album')).toBeInTheDocument();
    expect(screen.getByText('Page Two Album')).toBeInTheDocument();
  });

  it('sorts unknown-bucket albums after regular albums', () => {
    const regularAlbum = zodAlbum({
      name: 'Regular Album',
      systemKind: AlbumSystemKind.none,
      type: AlbumType.album,
    });
    const unknownBucketAlbum = zodAlbum({
      name: 'Internal Unknown Name',
      systemKind: AlbumSystemKind.unknown_bucket,
      type: AlbumType.album,
    });

    vi.mocked(useLibraryAlbumsInfinite).mockReturnValue(
      buildInfiniteMock([unknownBucketAlbum, regularAlbum]),
    );

    customRender(<AlbumsListPage />);

    const cards = screen.getAllByTestId('media-card');
    expect(within(cards[0]).getByText('Regular Album')).toBeInTheDocument();
    expect(within(cards[1]).getByText(UNKNOWN_ALBUM_LABEL)).toBeInTheDocument();
  });

  it('keeps relative order among unknown-bucket albums', () => {
    const firstUnknown = zodAlbum({
      name: 'First Unknown',
      systemKind: AlbumSystemKind.unknown_bucket,
      type: AlbumType.album,
    });
    const secondUnknown = zodAlbum({
      name: 'Second Unknown',
      systemKind: AlbumSystemKind.unknown_bucket,
      type: AlbumType.album,
    });

    vi.mocked(useLibraryAlbumsInfinite).mockReturnValue(
      buildInfiniteMock([firstUnknown, secondUnknown]),
    );

    customRender(<AlbumsListPage />);

    const subtitles = screen.getAllByText(UNKNOWN_ALBUM_LABEL);
    expect(subtitles).toHaveLength(2);
  });

  it('renders artist names in the subtitle when present', () => {
    vi.mocked(useLibraryAlbumsInfinite).mockReturnValue(
      buildInfiniteMock([
        zodAlbum({
          name: 'Collaboration',
          type: AlbumType.album,
          artists: [artistBuilder({ name: 'Artist One' }), artistBuilder({ name: 'Artist Two' })],
        }),
      ]),
    );

    customRender(<AlbumsListPage />);

    expect(screen.getByTestId('media-card-subtitle')).toHaveTextContent(
      'Artist One, Artist Two - album',
    );
  });

  it('uses the unknown artist label when an album has no artists', () => {
    vi.mocked(useLibraryAlbumsInfinite).mockReturnValue(
      buildInfiniteMock([
        zodAlbum({
          name: 'Solo Release',
          type: AlbumType.album,
          artists: [],
        }),
      ]),
    );

    customRender(<AlbumsListPage />);

    expect(screen.getByTestId('media-card-subtitle')).toHaveTextContent(
      `${UNKNOWN_ARTIST_LABEL} - album`,
    );
  });

  it('shows a spinner while fetching the next page', () => {
    vi.mocked(useLibraryAlbumsInfinite).mockReturnValue(
      buildInfiniteMock([zodAlbum({ name: 'Paged Album' })], {
        hasNext: true,
        isFetchingNextPage: true,
      }),
    );

    customRender(<AlbumsListPage />);

    expect(screen.getByText('Paged Album')).toBeInTheDocument();
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
  });
});
