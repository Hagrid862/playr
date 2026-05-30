import { useLibraryArtistsInfinite } from '@/hooks/api/library-artists/useLibraryArtistsInfinite';
import { artistBuilder } from '@repo/testing';
import { customRender } from '@repo/testing/web';
import { screen } from '@testing-library/react';
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
  MediaCard: ({ title }: { title: string }) => <div data-testid="media-card">{title}</div>,
}));

const mockFetchNextPage = vi.fn().mockResolvedValue(undefined);

function buildInfiniteMock(
  artists: ReturnType<typeof artistBuilder>[],
  options: { hasNext?: boolean } = {},
) {
  const items = artists.map((artist) => ({ artist }));
  return {
    data: {
      pages: [
        {
          data: { items, total: artists.length, page: 1, limit: 50 },
        },
      ],
    },
    isPending: false,
    hasNextPage: options.hasNext ?? false,
    isFetchingNextPage: false,
    fetchNextPage: mockFetchNextPage,
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
});
