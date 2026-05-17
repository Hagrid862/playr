import type {
  GetLibraryTracksResponse,
  LibraryTrackListSortBy,
  LibraryTrackListSortOrder,
} from '@repo/contracts';
import { keepPreviousData, type InfiniteData, useInfiniteQuery } from '@tanstack/react-query';
import { getLibraryTracks } from './requests/getLibraryTracks';

type Params = {
  genreId?: string;
  limit?: number;
  sortBy?: LibraryTrackListSortBy;
  sortOrder?: LibraryTrackListSortOrder;
};

type TracksInfiniteKey = readonly [
  'library',
  'tracks',
  'infinite',
  number,
  string,
  string,
];

export const useLibraryTracksInfinite = ({
  genreId,
  limit = 50,
  sortBy,
  sortOrder,
}: Params = {}) => {
  const genreKey = genreId ?? 'all';
  const sortKey = sortBy && sortOrder ? `${sortBy}:${sortOrder}` : 'default';

  return useInfiniteQuery<
    GetLibraryTracksResponse,
    Error,
    InfiniteData<GetLibraryTracksResponse>,
    TracksInfiniteKey,
    number
  >({
    queryKey: ['library', 'tracks', 'infinite', limit, genreKey, sortKey],
    queryFn: ({ pageParam }) =>
      getLibraryTracks({
        page: pageParam,
        limit,
        ...(genreId ? { genreId } : {}),
        ...(sortBy && sortOrder ? { sortBy, sortOrder } : {}),
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const d = lastPage.data;
      if (!d) return undefined;
      const { page, limit: pageLimit, total } = d;
      return page * pageLimit < total ? page + 1 : undefined;
    },
    /** Avoid empty flash / count flicker when `sortKey` (or other key parts) change. */
    placeholderData: keepPreviousData,
  });
};
