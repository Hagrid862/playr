import { apiClient } from '@/lib/api-client';
import { GetLibraryAlbumsResponseSchema, type GetLibraryAlbumsResponse } from '@repo/contracts';

export const getLibraryAlbums = (page = 1, limit = 20) => {
  return apiClient<GetLibraryAlbumsResponse>(`library/albums?page=${page}&limit=${limit}`, {
    method: 'GET',
    zodSchema: GetLibraryAlbumsResponseSchema,
  });
};
