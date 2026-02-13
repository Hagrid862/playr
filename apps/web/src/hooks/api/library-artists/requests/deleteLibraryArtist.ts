import { apiClient } from '@/lib/api-client';
import type { DeleteLibraryArtistResponse } from '@repo/contracts';
import { DeleteLibraryArtistResponseSchema } from '@repo/contracts';

export const deleteLibraryArtist = (id: string) => {
  return apiClient<DeleteLibraryArtistResponse>(`library/artists/${id}`, {
    method: 'DELETE',
    zodSchema: DeleteLibraryArtistResponseSchema,
  });
};
