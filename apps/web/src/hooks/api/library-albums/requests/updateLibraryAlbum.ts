import { apiClient } from '@/lib/api-client';
import {
  UpdateLibraryAlbumResponseSchema,
  type UpdateLibraryAlbumRequest,
  type UpdateLibraryAlbumResponse,
} from '@repo/contracts';

export const updateLibraryAlbum = (id: string, data: UpdateLibraryAlbumRequest) => {
  return apiClient<UpdateLibraryAlbumResponse>(`library/albums/${id}`, {
    method: 'PATCH',
    body: data,
    zodSchema: UpdateLibraryAlbumResponseSchema,
  });
};
