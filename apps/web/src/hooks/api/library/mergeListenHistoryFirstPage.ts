import type { GetListenHistoryResponse } from '@repo/contracts';
import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type { ListenHistoryListItem } from '@/lib/playback/playback-mappers';
import { getListenHistory } from './requests/getListenHistory';
import { listenHistoryInfiniteQueryKey } from './useListenHistoryInfinite';

type HistoryPage = GetListenHistoryResponse;

function historyPageItems(page: HistoryPage): ListenHistoryListItem[] {
  return page.data?.items ?? [];
}

/** Items that fell off the bottom of page 1 when a newer listen was prepended. */
function itemsPushedOffPage1(
  oldPage1Items: ListenHistoryListItem[],
  freshPage1Items: ListenHistoryListItem[],
): ListenHistoryListItem[] {
  const freshIds = new Set(freshPage1Items.map((item) => item.id));
  return oldPage1Items.filter((item) => !freshIds.has(item.id));
}

/**
 * After page 1 is refreshed, reconnect page 2+ without refetching:
 * prepend rolled-off page-1 tail, drop rows that moved into fresh page 1.
 */
function stitchFirstDeeperPage(
  freshPage1Items: ListenHistoryListItem[],
  oldPage1Items: ListenHistoryListItem[],
  deeperPage: HistoryPage,
): HistoryPage {
  const data = deeperPage.data;
  if (!data) return deeperPage;

  const freshIds = new Set(freshPage1Items.map((item) => item.id));
  const pushedOff = itemsPushedOffPage1(oldPage1Items, freshPage1Items);
  const pushedOffIds = new Set(pushedOff.map((item) => item.id));
  const rest = (data.items ?? []).filter(
    (item) => !freshIds.has(item.id) && !pushedOffIds.has(item.id),
  );
  const items = [...pushedOff, ...rest];
  const previousItems = data.items ?? [];
  const unchanged =
    items.length === previousItems.length &&
    items.every((item, index) => item.id === previousItems[index]?.id);
  if (unchanged) return deeperPage;

  return {
    ...deeperPage,
    data: { ...data, items },
  };
}

export function applyListenHistoryFirstPageMerge(
  old: InfiniteData<GetListenHistoryResponse> | undefined,
  fresh: GetListenHistoryResponse,
): InfiniteData<GetListenHistoryResponse> {
  const freshHeadId = fresh.data?.items[0]?.id;
  const oldHeadId = old?.pages[0]?.data?.items[0]?.id;
  if (old && freshHeadId && freshHeadId === oldHeadId) {
    return old;
  }

  if (!old?.pages.length) {
    return { pages: [fresh], pageParams: [1] };
  }

  const oldPage1Items = historyPageItems(old.pages[0]);
  const freshPage1Items = historyPageItems(fresh);
  const deeperPages = old.pages
    .slice(1)
    .map((page, index) =>
      index === 0 ? stitchFirstDeeperPage(freshPage1Items, oldPage1Items, page) : page,
    );

  // Refresh only page 1; keep deeper pages (stitched at the boundary) so skip does not re-fetch page 2+.
  return {
    pages: [fresh, ...deeperPages],
    pageParams: [1, ...old.pageParams.slice(1)],
  };
}

/**
 * Fetches page 1 and merges into the infinite-query cache.
 * Skips updates when the newest listen-history id is unchanged.
 */
export async function mergeListenHistoryFirstPage(
  queryClient: QueryClient,
  limit: number,
): Promise<void> {
  const fresh = await getListenHistory({ page: 1, limit });
  const key = listenHistoryInfiniteQueryKey(limit);
  queryClient.setQueryData<InfiniteData<GetListenHistoryResponse>>(key, (old) =>
    applyListenHistoryFirstPageMerge(old, fresh),
  );
}
