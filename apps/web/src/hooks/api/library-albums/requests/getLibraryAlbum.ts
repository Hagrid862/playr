import { apiClient } from '@/lib/api-client';
import { GetLibraryAlbumResponseSchema, type GetLibraryAlbumResponse } from '@repo/contracts';

export const getLibraryAlbum = (id: string) => {
  return apiClient<GetLibraryAlbumResponse>(`library/albums/${id}`, {
    method: 'GET',
    zodSchema: GetLibraryAlbumResponseSchema,
  });
};
