import type { GetListenHistoryResponse } from '@repo/contracts';
import { keepPreviousData, type InfiniteData, useInfiniteQuery } from '@tanstack/react-query';
import { getListenHistory } from './requests/getListenHistory';

type Params = {
  limit?: number;
  enabled?: boolean;
};

export function listenHistoryInfiniteQueryKey(limit: number) {
  return ['library', 'history', 'infinite', limit] as const;
}

type HistoryInfiniteKey = ReturnType<typeof listenHistoryInfiniteQueryKey>;

export const useListenHistoryInfinite = ({ limit = 20, enabled = true }: Params = {}) => {
  return useInfiniteQuery<
    GetListenHistoryResponse,
    Error,
    InfiniteData<GetListenHistoryResponse>,
    HistoryInfiniteKey,
    number
  >({
    enabled,
    queryKey: listenHistoryInfiniteQueryKey(limit),
    queryFn: ({ pageParam }) =>
      getListenHistory({
        page: pageParam,
        limit,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const d = lastPage.data;
      if (!d) return undefined;
      const { page, limit: pageLimit, total } = d;
      return page * pageLimit < total ? page + 1 : undefined;
    },
    placeholderData: keepPreviousData,
  });
};
