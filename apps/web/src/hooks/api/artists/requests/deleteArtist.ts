import { apiClient } from '@/lib/api-client';
import type { DeleteArtistResponse } from '@repo/contracts';
import { DeleteArtistResponseSchema } from '@repo/contracts';

export const deleteArtist = (id: string) => {
  return apiClient<DeleteArtistResponse>(`artists/${id}`, {
    method: 'DELETE',
    zodSchema: DeleteArtistResponseSchema,
  });
};
