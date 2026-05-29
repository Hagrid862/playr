import { useLibraryAlbumsInfinite } from '@/hooks/api/library-albums/useLibraryAlbumsInfinite';
import { albumBuilder } from '@repo/testing';
import { customRender } from '@repo/testing/web';
import { screen } from '@testing-library/react';
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
  MediaCard: ({ title }: { title: string }) => <div data-testid="media-card">{title}</div>,
}));

vi.mock('@/components/library/albums/AlbumLibraryContextMenu', () => ({
  AlbumLibraryContextMenu: () => null,
}));

const mockFetchNextPage = vi.fn().mockResolvedValue(undefined);

function buildInfiniteMock(
  albums: ReturnType<typeof albumBuilder>[],
  options: { hasNext?: boolean } = {},
) {
  const items = albums.map((album) => ({ album }));
  return {
    data: {
      pages: [
        {
          data: { items, total: albums.length, page: 1, limit: 50 },
        },
      ],
    },
    isPending: false,
    hasNextPage: options.hasNext ?? false,
    isFetchingNextPage: false,
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
});
