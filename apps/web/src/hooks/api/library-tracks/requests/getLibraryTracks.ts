import { apiClient } from '@/lib/api-client';
import { GetLibraryTracksResponseSchema, type GetLibraryTracksResponse } from '@repo/contracts';

export const getLibraryTracks = (
  params: { page?: number; limit?: number; albumId?: string; genreId?: string } = {},
) => {
  const { page = 1, limit = 20, albumId, genreId } = params;
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (albumId) {
    queryParams.append('albumId', albumId);
  }

  if (genreId) {
    queryParams.append('genreId', genreId);
  }

  return apiClient<GetLibraryTracksResponse>(`library/tracks?${queryParams.toString()}`, {
    method: 'GET',
    zodSchema: GetLibraryTracksResponseSchema,
  });
};
