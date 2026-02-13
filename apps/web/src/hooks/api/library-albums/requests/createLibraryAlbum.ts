import { apiClient } from '@/lib/api-client';
import {
  CreateLibraryAlbumResponseSchema,
  type CreateLibraryAlbumRequest,
  type CreateLibraryAlbumResponse,
} from '@repo/contracts';

export const createLibraryAlbum = (data: CreateLibraryAlbumRequest) => {
  return apiClient<CreateLibraryAlbumResponse>('library/albums', {
    method: 'POST',
    body: data,
    zodSchema: CreateLibraryAlbumResponseSchema,
  });
};
