import type { GetLibraryAlbumsResponse } from '@repo/contracts';
import { type InfiniteData, useInfiniteQuery } from '@tanstack/react-query';
import { getLibraryInfiniteNextPageParam } from '../getLibraryInfiniteNextPageParam';
import { getLibraryAlbums } from './requests/getLibraryAlbums';

type Params = { genreId?: string; limit?: number };

type AlbumsInfiniteKey = readonly ['library', 'albums', 'infinite', number, string];

export const useLibraryAlbumsInfinite = ({ genreId, limit = 50 }: Params = {}) => {
  const genreKey = genreId ?? 'all';

  return useInfiniteQuery<
    GetLibraryAlbumsResponse,
    Error,
    InfiniteData<GetLibraryAlbumsResponse>,
    AlbumsInfiniteKey,
    number
  >({
    queryKey: ['library', 'albums', 'infinite', limit, genreKey],
    queryFn: ({ pageParam }) =>
      getLibraryAlbums({
        page: pageParam,
        limit,
        ...(genreId ? { genreId } : {}),
      }),
    initialPageParam: 1,
    getNextPageParam: getLibraryInfiniteNextPageParam,
  });
};
