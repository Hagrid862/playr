import { apiClient } from '@/lib/api-client';
import { GetLibraryAlbumsResponseSchema, type GetLibraryAlbumsResponse } from '@repo/contracts';

export const getLibraryAlbums = (
  params: { page?: number; limit?: number; genreId?: string } = {},
) => {
  const { page = 1, limit = 20, genreId } = params;
  const query = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(genreId ? { genreId } : {}),
  });

  return apiClient<GetLibraryAlbumsResponse>(`library/albums?${query.toString()}`, {
    method: 'GET',
    zodSchema: GetLibraryAlbumsResponseSchema,
  });
};
