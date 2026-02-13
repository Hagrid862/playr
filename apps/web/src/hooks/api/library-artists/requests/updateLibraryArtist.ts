import { apiClient } from '@/lib/api-client';
import type { UpdateLibraryArtistRequest, UpdateLibraryArtistResponse } from '@repo/contracts';
import { UpdateLibraryArtistResponseSchema } from '@repo/contracts';

export const updateLibraryArtist = (id: string, data: UpdateLibraryArtistRequest) => {
  return apiClient<UpdateLibraryArtistResponse>(`library/artists/${id}`, {
    method: 'PATCH',
    body: data,
    zodSchema: UpdateLibraryArtistResponseSchema,
  });
};
