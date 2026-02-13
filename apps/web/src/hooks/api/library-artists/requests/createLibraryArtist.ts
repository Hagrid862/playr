import { apiClient } from '@/lib/api-client';
import type { CreateLibraryArtistRequest, CreateLibraryArtistResponse } from '@repo/contracts';
import { CreateLibraryArtistResponseSchema } from '@repo/contracts';

export const createLibraryArtist = (data: CreateLibraryArtistRequest) => {
  return apiClient<CreateLibraryArtistResponse>('library/artists', {
    method: 'POST',
    body: data,
    zodSchema: CreateLibraryArtistResponseSchema,
  });
};
