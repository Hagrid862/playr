import { apiClient } from '@/lib/api-client';
import type { GetLibraryArtistResponseDto } from '@repo/contracts';
import { GetLibraryArtistResponseSchema } from '@repo/contracts';

export const getLibraryArtist = (id: string) => {
  return apiClient<GetLibraryArtistResponseDto>(`library/artists/${id}`, {
    method: 'GET',
    zodSchema: GetLibraryArtistResponseSchema,
  });
};
