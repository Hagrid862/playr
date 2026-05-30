import { useLibraryAlbumsInfinite } from '@/hooks/api/library-albums/useLibraryAlbumsInfinite';
import { UNKNOWN_ALBUM_LABEL, UNKNOWN_ARTIST_LABEL } from '@/lib/display-constants';
import { albumBuilder, artistBuilder } from '@repo/testing';
import { customRender } from '@repo/testing/web';
import { screen, within } from '@testing-library/react';
import { AlbumSystemKind, AlbumType } from '@repo/db';
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

function buildInfiniteMock(
  albums: ReturnType<typeof albumBuilder>[],
  options: {
    hasNext?: boolean;
    isPending?: boolean;
    isFetchingNextPage?: boolean;
    pages?: { data: { items: { album?: ReturnType<typeof albumBuilder> }[] } }[];
  } = {},
) {
  const items = albums.map((album) => ({ album }));
  return {
    data: options.pages ?? {
      pages: [
        {
          data: { items, total: albums.length, page: 1, limit: 50 },
        },
      ],
    },
    isPending: options.isPending ?? false,
    hasNextPage: options.hasNext ?? false,
    isFetchingNextPage: options.isFetchingNextPage ?? false,
    fetchNextPage: mockFetchNextPage,
  };
}

describe('AlbumsListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    observerCallback = null;
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  it('renders albums from infinite query pages', () => {
    vi.mocked(useLibraryAlbumsInfinite).mockReturnValue(
      buildInfiniteMock([albumBuilder({ name: 'First Album' })]) as never,
    );

    customRender(<AlbumsListPage />);

    expect(screen.getByText('First Album')).toBeInTheDocument();
  });

  it('fetches the next page when the sentinel intersects', () => {
    vi.mocked(useLibraryAlbumsInfinite).mockReturnValue(
      buildInfiniteMock([albumBuilder({ name: 'First Album' })], { hasNext: true }) as never,
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
    vi.mocked(useLibraryAlbumsInfinite).mockReturnValue(
      buildInfiniteMock([], { isPending: true }) as never,
    );

    customRender(<AlbumsListPage />);

    expect(screen.getByText('Fetching your albums...')).toBeInTheDocument();
  });

  it('renders an empty state when there are no albums', () => {
    vi.mocked(useLibraryAlbumsInfinite).mockReturnValue(buildInfiniteMock([]) as never);

    customRender(<AlbumsListPage />);

    expect(screen.getByText('No albums found')).toBeInTheDocument();
    expect(screen.getByText(/Your private library is empty/i)).toBeInTheDocument();
  });

  it('renders an empty state when query pages are empty', () => {
    vi.mocked(useLibraryAlbumsInfinite).mockReturnValue(
      buildInfiniteMock([], { pages: { pages: [] } }) as never,
    );

    customRender(<AlbumsListPage />);

    expect(screen.getByText('No albums found')).toBeInTheDocument();
  });

  it('flattens albums from multiple pages and skips missing album payloads', () => {
    const firstAlbum = albumBuilder({ name: 'Page One Album' });
    const secondAlbum = albumBuilder({ name: 'Page Two Album' });

    vi.mocked(useLibraryAlbumsInfinite).mockReturnValue(
      buildInfiniteMock([], {
        pages: {
          pages: [
            { data: { items: [{ album: firstAlbum }, { album: undefined }] } },
            { data: undefined },
            { data: { items: [{ album: secondAlbum }] } },
          ],
        },
      }) as never,
    );

    customRender(<AlbumsListPage />);

    expect(screen.getByText('Page One Album')).toBeInTheDocument();
    expect(screen.getByText('Page Two Album')).toBeInTheDocument();
  });

  it('sorts unknown-bucket albums after regular albums', () => {
    const regularAlbum = albumBuilder({
      name: 'Regular Album',
      systemKind: AlbumSystemKind.none,
      type: AlbumType.album,
    });
    const unknownBucketAlbum = albumBuilder({
      name: 'Internal Unknown Name',
      systemKind: AlbumSystemKind.unknown_bucket,
      type: AlbumType.album,
    });

    vi.mocked(useLibraryAlbumsInfinite).mockReturnValue(
      buildInfiniteMock([unknownBucketAlbum, regularAlbum]) as never,
    );

    customRender(<AlbumsListPage />);

    const cards = screen.getAllByTestId('media-card');
    expect(within(cards[0]).getByText('Regular Album')).toBeInTheDocument();
    expect(within(cards[1]).getByText(UNKNOWN_ALBUM_LABEL)).toBeInTheDocument();
  });

  it('keeps relative order among unknown-bucket albums', () => {
    const firstUnknown = albumBuilder({
      name: 'First Unknown',
      systemKind: AlbumSystemKind.unknown_bucket,
      type: AlbumType.album,
    });
    const secondUnknown = albumBuilder({
      name: 'Second Unknown',
      systemKind: AlbumSystemKind.unknown_bucket,
      type: AlbumType.album,
    });

    vi.mocked(useLibraryAlbumsInfinite).mockReturnValue(
      buildInfiniteMock([firstUnknown, secondUnknown]) as never,
    );

    customRender(<AlbumsListPage />);

    const subtitles = screen.getAllByText(UNKNOWN_ALBUM_LABEL);
    expect(subtitles).toHaveLength(2);
  });

  it('renders artist names in the subtitle when present', () => {
    vi.mocked(useLibraryAlbumsInfinite).mockReturnValue(
      buildInfiniteMock([
        albumBuilder({
          name: 'Collaboration',
          type: AlbumType.album,
          artists: [artistBuilder({ name: 'Artist One' }), artistBuilder({ name: 'Artist Two' })],
        }),
      ]) as never,
    );

    customRender(<AlbumsListPage />);

    expect(screen.getByTestId('media-card-subtitle')).toHaveTextContent(
      'Artist One, Artist Two - album',
    );
  });

  it('uses the unknown artist label when an album has no artists', () => {
    vi.mocked(useLibraryAlbumsInfinite).mockReturnValue(
      buildInfiniteMock([
        albumBuilder({
          name: 'Solo Release',
          type: AlbumType.album,
          artists: [],
        }),
      ]) as never,
    );

    customRender(<AlbumsListPage />);

    expect(screen.getByTestId('media-card-subtitle')).toHaveTextContent(
      `${UNKNOWN_ARTIST_LABEL} - album`,
    );
  });

  it('shows a spinner while fetching the next page', () => {
    vi.mocked(useLibraryAlbumsInfinite).mockReturnValue(
      buildInfiniteMock([albumBuilder({ name: 'Paged Album' })], {
        hasNext: true,
        isFetchingNextPage: true,
      }) as never,
    );

    customRender(<AlbumsListPage />);

    expect(screen.getByText('Paged Album')).toBeInTheDocument();
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
  });
});
