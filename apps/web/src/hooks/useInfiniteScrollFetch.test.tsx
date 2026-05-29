import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useInfiniteScrollFetch } from './useInfiniteScrollFetch';

let observerCallback: IntersectionObserverCallback | null = null;

class MockIntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {
    observerCallback = callback;
  }
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

function ScrollHarness({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => Promise<unknown>;
}) {
  const sentinelRef = useInfiniteScrollFetch({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });
  return <div ref={sentinelRef} data-testid="sentinel" />;
}

describe('useInfiniteScrollFetch', () => {
  const mockFetchNextPage = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    observerCallback = null;
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls fetchNextPage when sentinel intersects and more pages exist', () => {
    render(
      <ScrollHarness
        hasNextPage
        isFetchingNextPage={false}
        fetchNextPage={mockFetchNextPage}
      />,
    );

    expect(observerCallback).toBeDefined();
    observerCallback!(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );

    expect(mockFetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('does not fetch when already fetching next page', () => {
    render(
      <ScrollHarness hasNextPage isFetchingNextPage fetchNextPage={mockFetchNextPage} />,
    );

    observerCallback!(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );

    expect(mockFetchNextPage).not.toHaveBeenCalled();
  });

  it('does not fetch when there is no next page', () => {
    render(
      <ScrollHarness
        hasNextPage={false}
        isFetchingNextPage={false}
        fetchNextPage={mockFetchNextPage}
      />,
    );

    observerCallback!(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );

    expect(mockFetchNextPage).not.toHaveBeenCalled();
  });

  it('does not fetch when sentinel is not intersecting', () => {
    render(
      <ScrollHarness
        hasNextPage
        isFetchingNextPage={false}
        fetchNextPage={mockFetchNextPage}
      />,
    );

    observerCallback!(
      [{ isIntersecting: false } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );

    expect(mockFetchNextPage).not.toHaveBeenCalled();
  });
});
