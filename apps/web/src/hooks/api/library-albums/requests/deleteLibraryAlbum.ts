import { apiClient } from '@/lib/api-client';
import { DeleteLibraryAlbumResponseSchema, type DeleteLibraryAlbumResponse } from '@repo/contracts';

export const deleteLibraryAlbum = (id: string, options?: { keepTracks?: boolean }) => {
  const params = new URLSearchParams();
  if (options?.keepTracks === true) {
    params.set('keepTracks', 'true');
  }
  const qs = params.toString();
  const path = qs.length > 0 ? `library/albums/${id}?${qs}` : `library/albums/${id}`;
  return apiClient<DeleteLibraryAlbumResponse>(path, {
    method: 'DELETE',
    zodSchema: DeleteLibraryAlbumResponseSchema,
  });
};
