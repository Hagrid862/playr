import { apiClient } from '@/lib/api-client';
import type { CreateLibraryGenreRequest, CreateLibraryGenreResponse } from '@repo/contracts';
import { CreateLibraryGenreResponseSchema } from '@repo/contracts';

export const createLibraryGenre = (data: CreateLibraryGenreRequest) => {
  return apiClient<CreateLibraryGenreResponse>('library/genres', {
    method: 'POST',
    body: data,
    zodSchema: CreateLibraryGenreResponseSchema,
  });
};
