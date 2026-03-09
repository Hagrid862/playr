import { apiClient } from '@/lib/api-client';
import { GetLibraryTracksResponseSchema, type GetLibraryTracksResponse } from '@repo/contracts';

export const getLibraryTracks = (page = 1, limit = 20, albumId?: string) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (albumId) {
    params.append('albumId', albumId);
  }

  return apiClient<GetLibraryTracksResponse>(`library/tracks?${params.toString()}`, {
    method: 'GET',
    zodSchema: GetLibraryTracksResponseSchema,
  });
};
