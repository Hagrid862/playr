import { apiClient } from '@/lib/api-client';
import { DeleteLibraryAlbumResponseSchema, type DeleteLibraryAlbumResponse } from '@repo/contracts';

export const deleteLibraryAlbum = (id: string) => {
  return apiClient<DeleteLibraryAlbumResponse>(`library/albums/${id}`, {
    method: 'DELETE',
    zodSchema: DeleteLibraryAlbumResponseSchema,
  });
};
