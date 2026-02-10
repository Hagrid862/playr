import { apiClient } from '@/lib/api-client';
import type { GetPrivateArtistsResponse } from '@repo/contracts';
import { GetPrivateArtistsResponseSchema } from '@repo/contracts';

export const getPrivateArtists = () => {
  return apiClient<GetPrivateArtistsResponse>('artists/private', {
    method: 'GET',
    zodSchema: GetPrivateArtistsResponseSchema,
  });
};
