import { ApiError } from '@/lib/api-error';
import type { CreateLibraryGenreResponse } from '@repo/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createLibraryGenre } from './requests/createLibraryGenre';

export const useCreateLibraryGenre = () => {
  const queryClient = useQueryClient();

  return useMutation<
    CreateLibraryGenreResponse,
    ApiError,
    Parameters<typeof createLibraryGenre>[0]
  >({
    mutationFn: createLibraryGenre,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library', 'genres'] });
    },
  });
};
