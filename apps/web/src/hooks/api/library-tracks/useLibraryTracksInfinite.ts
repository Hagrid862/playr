import type { GetLibraryTracksResponse } from '@repo/contracts';
import { type InfiniteData, useInfiniteQuery } from '@tanstack/react-query';
import { getLibraryTracks } from './requests/getLibraryTracks';

type Params = { genreId?: string; limit?: number };

type TracksInfiniteKey = readonly ['library', 'tracks', 'infinite', number, string];

export const useLibraryTracksInfinite = ({ genreId, limit = 50 }: Params = {}) => {
  const genreKey = genreId ?? 'all';
  return useInfiniteQuery<
    GetLibraryTracksResponse,
    Error,
    InfiniteData<GetLibraryTracksResponse>,
    TracksInfiniteKey,
    number
  >({
    queryKey: ['library', 'tracks', 'infinite', limit, genreKey],
    queryFn: ({ pageParam }) =>
      getLibraryTracks({ page: pageParam, limit, ...(genreId ? { genreId } : {}) }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const d = lastPage.data;
      if (!d) return undefined;
      const { page, limit: pageLimit, total } = d;
      return page * pageLimit < total ? page + 1 : undefined;
    },
  });
};
