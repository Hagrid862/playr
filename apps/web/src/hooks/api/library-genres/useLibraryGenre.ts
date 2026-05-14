import type { GetLibraryGenreResponse } from '@repo/contracts';
import { useQuery } from '@tanstack/react-query';
import { getLibraryGenre } from './requests/getLibraryGenre';

export const useLibraryGenre = (id: string) => {
  return useQuery<GetLibraryGenreResponse, Error>({
    queryKey: ['library', 'genres', id],
    queryFn: () => getLibraryGenre(id),
    enabled: !!id,
  });
};
