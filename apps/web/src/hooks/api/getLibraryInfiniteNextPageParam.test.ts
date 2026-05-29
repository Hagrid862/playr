import { describe, expect, it } from 'vitest';
import { getLibraryInfiniteNextPageParam } from './getLibraryInfiniteNextPageParam';

describe('getLibraryInfiniteNextPageParam', () => {
  it('returns next page when more items exist', () => {
    expect(
      getLibraryInfiniteNextPageParam({
        data: { page: 1, limit: 20, total: 45 },
      }),
    ).toBe(2);
  });

  it('returns undefined on the last page', () => {
    expect(
      getLibraryInfiniteNextPageParam({
        data: { page: 3, limit: 20, total: 45 },
      }),
    ).toBeUndefined();
  });

  it('returns undefined when data is missing', () => {
    expect(getLibraryInfiniteNextPageParam({ data: null })).toBeUndefined();
    expect(getLibraryInfiniteNextPageParam({})).toBeUndefined();
  });
});
