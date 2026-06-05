import type { GetListenHistoryResponse } from '@repo/contracts';
import type { InfiniteData } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { applyListenHistoryFirstPageMerge } from './mergeListenHistoryFirstPage';

const page = (items: { id: string }[], pageNum = 1): GetListenHistoryResponse =>
  ({
    success: true as const,
    data: {
      items: items.map((item) => ({
        id: item.id,
        listenedAt: '2026-05-27T10:00:00Z',
        durationMs: 0,
        completed: false,
        track: { id: item.id, title: item.id },
      })),
      total: items.length,
      page: pageNum,
      limit: 20,
    },
    error: null,
    meta: {
      timestamp: '2026-05-27T00:00:00.000Z',
      requestId: 'req-test',
      path: '/library/history',
    },
  }) as unknown as GetListenHistoryResponse;

const infinite = (
  pages: GetListenHistoryResponse[],
  pageParams: number[],
): InfiniteData<GetListenHistoryResponse> => ({
  pages,
  pageParams,
});

describe('applyListenHistoryFirstPageMerge', () => {
  it('returns fresh page 1 when cache is empty', () => {
    const fresh = page([{ id: 'new' }]);
    expect(applyListenHistoryFirstPageMerge(undefined, fresh)).toEqual({
      pages: [fresh],
      pageParams: [1],
    });
  });

  it('returns old cache when head listen-history id is unchanged', () => {
    const fresh = page([{ id: 'head' }, { id: 'b' }]);
    const old = infinite([page([{ id: 'head' }, { id: 'a' }]), page([{ id: 'tail' }], 2)], [1, 2]);
    const result = applyListenHistoryFirstPageMerge(old, fresh);
    expect(result).toBe(old);
    expect(result.pages).toHaveLength(2);
  });

  it('replaces page 1 and keeps already-loaded deeper pages when head changes', () => {
    const fresh = page([{ id: 'new' }, { id: 'a' }]);
    const oldPage2 = page([{ id: 'tail' }], 2);
    const old = infinite([page([{ id: 'a' }]), oldPage2], [1, 2]);
    expect(applyListenHistoryFirstPageMerge(old, fresh)).toEqual({
      pages: [fresh, oldPage2],
      pageParams: [1, 2],
    });
  });

  it('prepends rolled-off page-1 tail onto page 2 so item 21 is not blank', () => {
    const oldPage1 = page(Array.from({ length: 20 }, (_, i) => ({ id: `item-${i + 1}` })));
    const fresh = page([
      { id: 'new-listen' },
      ...Array.from({ length: 19 }, (_, i) => ({ id: `item-${i + 1}` })),
    ]);
    const oldPage2 = page([{ id: 'item-21' }, { id: 'item-22' }], 2);
    const old = infinite([oldPage1, oldPage2], [1, 2]);

    const result = applyListenHistoryFirstPageMerge(old, fresh);
    const mergedPage2Items = result.pages[1]?.data?.items ?? [];

    expect(mergedPage2Items.map((item) => item.id)).toEqual(['item-20', 'item-21', 'item-22']);
    expect(result.pages[0]).toBe(fresh);
  });
});
