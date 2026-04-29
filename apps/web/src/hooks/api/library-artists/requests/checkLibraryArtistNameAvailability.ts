import { apiClient } from '@/lib/api-client';
import type { GetLibraryArtistNameAvailabilityResponse } from '@repo/contracts';
import { GetLibraryArtistNameAvailabilityResponseSchema } from '@repo/contracts';

export const checkLibraryArtistNameAvailability = (name: string) => {
  const params = new URLSearchParams({ name });
  return apiClient<GetLibraryArtistNameAvailabilityResponse>(
    `library/artists/availability?${params.toString()}`,
    {
      method: 'GET',
      zodSchema: GetLibraryArtistNameAvailabilityResponseSchema,
    },
  );
};
