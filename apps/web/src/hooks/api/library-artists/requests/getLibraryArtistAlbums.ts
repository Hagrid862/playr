import { apiClient } from '@/lib/api-client';
import type { GetLibraryArtistAlbumsResponseDto } from '@repo/contracts';
import { GetLibraryArtistAlbumsResponseSchema } from '@repo/contracts';

export const getLibraryArtistAlbums = (id: string, page = 1, limit = 20) => {
  return apiClient<GetLibraryArtistAlbumsResponseDto>(
    `library/artists/${id}/albums?page=${page}&limit=${limit}`,
    {
      method: 'GET',
      zodSchema: GetLibraryArtistAlbumsResponseSchema,
    },
  );
};
