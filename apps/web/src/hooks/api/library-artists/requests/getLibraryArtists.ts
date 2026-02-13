import { apiClient } from '@/lib/api-client';
import type { GetLibraryArtistsResponseDto } from '@repo/contracts';
import { GetLibraryArtistsResponseSchema } from '@repo/contracts';

export const getLibraryArtists = (page = 1, limit = 20) => {
  return apiClient<GetLibraryArtistsResponseDto>(`library/artists?page=${page}&limit=${limit}`, {
    method: 'GET',
    zodSchema: GetLibraryArtistsResponseSchema,
  });
};
