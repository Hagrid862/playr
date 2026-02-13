import { apiClient } from '@/lib/api-client';
import type { GetLibraryArtistAlbumsResponseDto } from '@repo/contracts';
import { GetLibraryArtistAlbumsResponseSchema } from '@repo/contracts';
import { AlbumType } from '@repo/db';

export const getLibraryArtistAlbums = (id: string, page = 1, limit = 20, type?: AlbumType) => {
  const searchParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (type) {
    searchParams.append('type', type);
  }

  return apiClient<GetLibraryArtistAlbumsResponseDto>(
    `library/artists/${id}/albums?${searchParams.toString()}`,
    {
      method: 'GET',
      zodSchema: GetLibraryArtistAlbumsResponseSchema,
    },
  );
};
