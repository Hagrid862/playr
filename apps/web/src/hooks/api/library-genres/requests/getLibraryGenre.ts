import { apiClient } from '@/lib/api-client';
import { GetLibraryGenreResponseSchema, type GetLibraryGenreResponse } from '@repo/contracts';

export const getLibraryGenre = (id: string) => {
  return apiClient<GetLibraryGenreResponse>(`library/genres/${id}`, {
    method: 'GET',
    zodSchema: GetLibraryGenreResponseSchema,
  });
};
