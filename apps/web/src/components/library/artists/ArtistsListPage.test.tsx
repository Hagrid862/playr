import { useLibraryArtistsInfinite } from '@/hooks/api/library-artists/useLibraryArtistsInfinite';
import { artistBuilder } from '@repo/testing';
import { customRender } from '@repo/testing/web';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Visibility } from '@repo/db';
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

function buildInfiniteMock(
  artists: ReturnType<typeof artistBuilder>[],
  options: {
    hasNext?: boolean;
    isPending?: boolean;
    isError?: boolean;
    error?: Error;
    isFetchingNextPage?: boolean;
    pages?: { data: { items: { artist?: ReturnType<typeof artistBuilder> }[] } }[];
  } = {},
) {
  const items = artists.map((artist) => ({ artist }));
  return {
    data: options.isError
      ? undefined
      : (options.pages ?? {
          pages: [
            {
              data: { items, total: artists.length, page: 1, limit: 50 },
            },
          ],
        }),
    isPending: options.isPending ?? false,
    isError: options.isError ?? false,
    error: options.error ?? null,
    hasNextPage: options.hasNext ?? false,
    isFetchingNextPage: options.isFetchingNextPage ?? false,
    fetchNextPage: mockFetchNextPage,
    refetch: mockRefetch,
  };
}

describe('ArtistsListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    observerCallback = null;
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  it('renders artists from infinite query pages', () => {
    vi.mocked(useLibraryArtistsInfinite).mockReturnValue(
      buildInfiniteMock([
        artistBuilder({ name: 'Alpha' }),
        artistBuilder({ name: 'Beta' }),
      ]) as never,
    );

    customRender(<ArtistsListPage />);

    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('fetches the next page when the sentinel intersects', () => {
    vi.mocked(useLibraryArtistsInfinite).mockReturnValue(
      buildInfiniteMock([artistBuilder({ name: 'Alpha' })], { hasNext: true }) as never,
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
      buildInfiniteMock([], { isPending: true }) as never,
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
      }) as never,
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
      }) as never,
    );

    customRender(<ArtistsListPage />);

    expect(screen.getAllByText('Could not load artists')).toHaveLength(2);
    expect(screen.queryByText('No artists found')).not.toBeInTheDocument();
  });

  it('renders an empty state when there are no artists', () => {
    vi.mocked(useLibraryArtistsInfinite).mockReturnValue(buildInfiniteMock([]) as never);

    customRender(<ArtistsListPage />);

    expect(screen.getByText('No artists found')).toBeInTheDocument();
    expect(screen.getByText(/Your private library is empty/i)).toBeInTheDocument();
  });

  it('renders an empty state when query pages are empty', () => {
    vi.mocked(useLibraryArtistsInfinite).mockReturnValue(
      buildInfiniteMock([], { pages: { pages: [] } }) as never,
    );

    customRender(<ArtistsListPage />);

    expect(screen.getByText('No artists found')).toBeInTheDocument();
  });

  it('flattens artists from multiple pages and skips missing artist payloads', () => {
    const firstArtist = artistBuilder({ name: 'Page One Artist' });
    const secondArtist = artistBuilder({ name: 'Page Two Artist' });

    vi.mocked(useLibraryArtistsInfinite).mockReturnValue(
      buildInfiniteMock([], {
        pages: {
          pages: [
            { data: { items: [{ artist: firstArtist }, { artist: undefined }] } },
            { data: undefined },
            { data: { items: [{ artist: secondArtist }] } },
          ],
        },
      }) as never,
    );

    customRender(<ArtistsListPage />);

    expect(screen.getByText('Page One Artist')).toBeInTheDocument();
    expect(screen.getByText('Page Two Artist')).toBeInTheDocument();
  });

  it('renders community and private artist subtitles', () => {
    vi.mocked(useLibraryArtistsInfinite).mockReturnValue(
      buildInfiniteMock([
        artistBuilder({
          name: 'Community Star',
          visibility: Visibility.community,
          isCommunity: true,
        }),
        artistBuilder({
          name: 'Private Act',
          visibility: Visibility.private,
          isCommunity: false,
        }),
      ]) as never,
    );

    customRender(<ArtistsListPage />);

    expect(screen.getByText('Community Artist')).toBeInTheDocument();
    expect(screen.getByText('Private Artist')).toBeInTheDocument();
  });

  it('shows a spinner while fetching the next page', () => {
    vi.mocked(useLibraryArtistsInfinite).mockReturnValue(
      buildInfiniteMock([artistBuilder({ name: 'Paged Artist' })], {
        hasNext: true,
        isFetchingNextPage: true,
      }) as never,
    );

    customRender(<ArtistsListPage />);

    expect(screen.getByText('Paged Artist')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
  });
});
