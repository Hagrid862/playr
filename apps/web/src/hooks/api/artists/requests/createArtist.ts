import { apiClient } from '@/lib/api-client';
import type { CreateArtistRequest, CreateArtistResponse } from '@repo/contracts';
import { CreateArtistResponseSchema } from '@repo/contracts';

export const createArtist = (data: CreateArtistRequest) => {
  return apiClient<CreateArtistResponse>('artists', {
    method: 'POST',
    body: data,
    zodSchema: CreateArtistResponseSchema,
  });
};
