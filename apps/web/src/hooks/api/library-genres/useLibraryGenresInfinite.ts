import type { GetLibraryGenresRequest, GetLibraryGenresResponse } from '@repo/contracts';
import { type InfiniteData, useInfiniteQuery } from '@tanstack/react-query';
import { getLibraryGenres } from './requests/getLibraryGenres';

type Params = Partial<Pick<GetLibraryGenresRequest, 'query' | 'kind'>> & {
  limit?: number;
};

type GenresInfiniteKey = readonly ['library', 'genres', 'infinite', number, string, string];

export const useLibraryGenresInfinite = (params: Params = {}) => {
  const { limit = 50, query, kind } = params;
  const queryStr = query ?? '';
  const kindStr = kind ?? '';

  return useInfiniteQuery<
    GetLibraryGenresResponse,
    Error,
    InfiniteData<GetLibraryGenresResponse>,
    GenresInfiniteKey,
    number
  >({
    queryKey: ['library', 'genres', 'infinite', limit, queryStr, kindStr],
    queryFn: ({ pageParam }) =>
      getLibraryGenres({
        page: pageParam,
        limit,
        query: query && query !== '' ? query : undefined,
        kind,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const d = lastPage.data;
      if (!d) return undefined;
      const { page, limit: pageLimit, total } = d;
      return page * pageLimit < total ? page + 1 : undefined;
    },
  });
};
