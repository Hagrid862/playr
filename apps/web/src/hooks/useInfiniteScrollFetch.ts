import { useEffect, useRef } from 'react';

type Params = {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => Promise<unknown>;
  rootMargin?: string;
  enabled?: boolean;
};

/** Observes a sentinel element and calls `fetchNextPage` when it nears the viewport. */
export function useInfiniteScrollFetch({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  rootMargin = '150px',
  enabled = true,
}: Params) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { root: null, rootMargin },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [enabled, hasNextPage, isFetchingNextPage, fetchNextPage, rootMargin]);

  return sentinelRef;
}
