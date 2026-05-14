import type { GetLibraryAlbumsResponse } from '@repo/contracts';
import { type InfiniteData, useInfiniteQuery } from '@tanstack/react-query';
import { getLibraryAlbums } from './requests/getLibraryAlbums';

type Params = { genreId: string; limit?: number };

type AlbumsInfiniteKey = readonly ['library', 'albums', 'infinite', number, string];

export const useLibraryAlbumsInfinite = ({ genreId, limit = 50 }: Params) => {
  return useInfiniteQuery<
    GetLibraryAlbumsResponse,
    Error,
    InfiniteData<GetLibraryAlbumsResponse>,
    AlbumsInfiniteKey,
    number
  >({
    queryKey: ['library', 'albums', 'infinite', limit, genreId],
    queryFn: ({ pageParam }) => getLibraryAlbums({ page: pageParam, limit, genreId }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const d = lastPage.data;
      if (!d) return undefined;
      const { page, limit: pageLimit, total } = d;
      return page * pageLimit < total ? page + 1 : undefined;
    },
  });
};
