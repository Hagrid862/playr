import { apiClient } from '@/lib/api-client';
import type { UpdateArtistRequest, UpdateArtistResponse } from '@repo/contracts';
import { UpdateArtistResponseSchema } from '@repo/contracts';

export const updateArtist = (id: string, data: UpdateArtistRequest) => {
  return apiClient<UpdateArtistResponse>(`artists/${id}`, {
    method: 'PATCH',
    body: data,
    zodSchema: UpdateArtistResponseSchema,
  });
};
