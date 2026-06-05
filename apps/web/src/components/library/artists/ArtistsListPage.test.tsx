import { useLibraryArtistsInfinite } from '@/hooks/api/library-artists/useLibraryArtistsInfinite';
import type { GetLibraryArtistsResponseDto, ZodArtist } from '@repo/contracts';
import { artistBuilder } from '@repo/testing';
import { customRender } from '@repo/testing/web';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Visibility } from '@repo/db';
import type { InfiniteData } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ArtistsListPage } from './ArtistsListPage';

let observerCallback: IntersectionObserverCallback | null = null;

class MockIntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {
    observerCallback = callback;
  }
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

vi.mock('@/hooks/api/library-artists/useLibraryArtistsInfinite', () => ({
  useLibraryArtistsInfinite: vi.fn(),
}));

vi.mock('@/components/library/MediaCard', () => ({
  MediaCard: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div data-testid="media-card">
      <span>{title}</span>
      {subtitle ? <span data-testid="media-card-subtitle">{subtitle}</span> : null}
    </div>
  ),
}));

const mockFetchNextPage = vi.fn().mockResolvedValue(undefined);
const mockRefetch = vi.fn().mockResolvedValue({});

const defaultPageMeta = {
  timestamp: '2026-01-01T00:00:00.000Z',
  requestId: 'req-test',
  path: '/library/artists',
} as const;

function zodArtist(overrides: Partial<ZodArtist> = {}): ZodArtist {
  return { ...artistBuilder(), ...overrides };
}

function toLibraryArtistItem(
  artist: ZodArtist,
): GetLibraryArtistsResponseDto['data']['items'][number] {
  return {
    id: `library-artist-${artist.id}`,
    libraryId: 'library-test',
    artistId: artist.id,
    createdAt: artist.createdAt,
    updatedAt: artist.updatedAt,
    deletedAt: artist.deletedAt,
    artist,
  };
}

function buildArtistPage(artists: ZodArtist[], page = 1, limit = 50): GetLibraryArtistsResponseDto {
  return {
    success: true,
    data: {
      items: artists.map(toLibraryArtistItem),
      total: artists.length,
      page,
      limit,
    },
    error: null,
    meta: defaultPageMeta,
  };
}

/** Page shape the list flattener must tolerate at runtime (missing `data`). */
type ArtistsInfinitePage =
  | GetLibraryArtistsResponseDto
  | {
      success: true;
      data: undefined;
      error: null;
      meta: typeof defaultPageMeta;
    };

function buildArtistPageMissingData(): ArtistsInfinitePage {
  return {
    success: true,
    data: undefined,
    error: null,
    meta: defaultPageMeta,
  };
}

type ArtistsInfiniteQueryFields = Pick<
  ReturnType<typeof useLibraryArtistsInfinite>,
  | 'isPending'
  | 'isError'
  | 'error'
  | 'hasNextPage'
  | 'isFetchingNextPage'
  | 'fetchNextPage'
  | 'refetch'
> & {
  data?: InfiniteData<ArtistsInfinitePage>;
};

function asArtistsInfiniteQueryResult(
  value: ArtistsInfiniteQueryFields,
): ReturnType<typeof useLibraryArtistsInfinite> {
  return value as unknown as ReturnType<typeof useLibraryArtistsInfinite>;
}

function buildInfiniteMock(
  artists: ZodArtist[],
  options: {
    hasNext?: boolean;
    isPending?: boolean;
    isError?: boolean;
    error?: Error | { name: string; message: string };
    isFetchingNextPage?: boolean;
    infiniteData?: InfiniteData<ArtistsInfinitePage>;
  } = {},
): ReturnType<typeof useLibraryArtistsInfinite> {
  return asArtistsInfiniteQueryResult({
    data: options.isError
      ? undefined
      : (options.infiniteData ??
        ({
          pages: [buildArtistPage(artists)],
          pageParams: [1],
        } satisfies InfiniteData<ArtistsInfinitePage>)),
    isPending: options.isPending ?? false,
    isError: options.isError ?? false,
    error: options.error ?? null,
    hasNextPage: options.hasNext ?? false,
    isFetchingNextPage: options.isFetchingNextPage ?? false,
    fetchNextPage: mockFetchNextPage,
    refetch: mockRefetch,
  });
}

describe('ArtistsListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    observerCallback = null;
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  it('renders artists from infinite query pages', () => {
    vi.mocked(useLibraryArtistsInfinite).mockReturnValue(
      buildInfiniteMock([zodArtist({ name: 'Alpha' }), zodArtist({ name: 'Beta' })]),
    );

    customRender(<ArtistsListPage />);

    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('fetches the next page when the sentinel intersects', () => {
    vi.mocked(useLibraryArtistsInfinite).mockReturnValue(
      buildInfiniteMock([zodArtist({ name: 'Alpha' })], { hasNext: true }),
    );

    customRender(<ArtistsListPage />);

    expect(observerCallback).toBeDefined();
    observerCallback!(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );

    expect(mockFetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('renders a loading state while artists are pending', () => {
    vi.mocked(useLibraryArtistsInfinite).mockReturnValue(
      buildInfiniteMock([], { isPending: true }),
    );

    customRender(<ArtistsListPage />);

    expect(screen.getByText('Fetching your artists...')).toBeInTheDocument();
  });

  it('renders an error state with message and retry when the query fails', async () => {
    const user = userEvent.setup();
    vi.mocked(useLibraryArtistsInfinite).mockReturnValue(
      buildInfiniteMock([], {
        isError: true,
        error: new Error('Network request failed'),
      }),
    );

    customRender(<ArtistsListPage />);

    expect(screen.getByText('Could not load artists')).toBeInTheDocument();
    expect(screen.getByText('Network request failed')).toBeInTheDocument();
    expect(screen.queryByText('No artists found')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('renders an error state with fallback message when the query fails with a non-Error object', () => {
    vi.mocked(useLibraryArtistsInfinite).mockReturnValue(
      buildInfiniteMock([], {
        isError: true,
        error: { name: 'Error', message: 'Network request failed' },
      }),
    );

    customRender(<ArtistsListPage />);

    expect(screen.getAllByText('Could not load artists')).toHaveLength(2);
    expect(screen.queryByText('No artists found')).not.toBeInTheDocument();
  });

  it('renders an empty state when there are no artists', () => {
    vi.mocked(useLibraryArtistsInfinite).mockReturnValue(buildInfiniteMock([]));

    customRender(<ArtistsListPage />);

    expect(screen.getByText('No artists found')).toBeInTheDocument();
    expect(screen.getByText(/Your private library is empty/i)).toBeInTheDocument();
  });

  it('renders an empty state when query pages are empty', () => {
    vi.mocked(useLibraryArtistsInfinite).mockReturnValue(
      buildInfiniteMock([], {
        infiniteData: { pages: [], pageParams: [] },
      }),
    );

    customRender(<ArtistsListPage />);

    expect(screen.getByText('No artists found')).toBeInTheDocument();
  });

  it('flattens artists from multiple pages and skips missing artist payloads', () => {
    const firstArtist = zodArtist({ name: 'Page One Artist' });
    const secondArtist = zodArtist({ name: 'Page Two Artist' });

    vi.mocked(useLibraryArtistsInfinite).mockReturnValue(
      buildInfiniteMock([], {
        infiniteData: {
          pages: [
            {
              ...buildArtistPage([firstArtist]),
              data: {
                items: [
                  toLibraryArtistItem(firstArtist),
                  { ...toLibraryArtistItem(firstArtist), artist: undefined },
                ],
                total: 2,
                page: 1,
                limit: 50,
              },
            },
            buildArtistPageMissingData(),
            buildArtistPage([secondArtist], 2),
          ],
          pageParams: [1, 2, 3],
        },
      }),
    );

    customRender(<ArtistsListPage />);

    expect(screen.getByText('Page One Artist')).toBeInTheDocument();
    expect(screen.getByText('Page Two Artist')).toBeInTheDocument();
  });

  it('renders community and private artist subtitles', () => {
    vi.mocked(useLibraryArtistsInfinite).mockReturnValue(
      buildInfiniteMock([
        zodArtist({
          name: 'Community Star',
          visibility: Visibility.community,
          isCommunity: true,
        }),
        zodArtist({
          name: 'Private Act',
          visibility: Visibility.private,
          isCommunity: false,
        }),
      ]),
    );

    customRender(<ArtistsListPage />);

    expect(screen.getByText('Community Artist')).toBeInTheDocument();
    expect(screen.getByText('Private Artist')).toBeInTheDocument();
  });

  it('shows a spinner while fetching the next page', () => {
    vi.mocked(useLibraryArtistsInfinite).mockReturnValue(
      buildInfiniteMock([zodArtist({ name: 'Paged Artist' })], {
        hasNext: true,
        isFetchingNextPage: true,
      }),
    );

    customRender(<ArtistsListPage />);

    expect(screen.getByText('Paged Artist')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
  });
});
