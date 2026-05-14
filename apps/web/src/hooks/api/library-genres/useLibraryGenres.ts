import type { GetLibraryGenresRequest, GetLibraryGenresResponse } from '@repo/contracts';
import { useQuery } from '@tanstack/react-query';
import { getLibraryGenres } from './requests/getLibraryGenres';

export const useLibraryGenres = (params: GetLibraryGenresRequest) => {
  const { page = 1, limit = 20, query, kind } = params;

  return useQuery<GetLibraryGenresResponse, Error>({
    queryKey: ['library', 'genres', page, limit, query ?? '', kind ?? ''],
    queryFn: () => getLibraryGenres({ page, limit, query, kind }),
  });
};
