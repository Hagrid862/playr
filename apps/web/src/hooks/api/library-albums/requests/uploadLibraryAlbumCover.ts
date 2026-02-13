import { apiClient } from '@/lib/api-client';
import {
  UploadLibraryAlbumCoverResponseSchema,
  type UploadLibraryAlbumCoverResponse,
} from '@repo/contracts';

export const uploadLibraryAlbumCover = (id: string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  return apiClient<UploadLibraryAlbumCoverResponse>(`library/albums/${id}/cover`, {
    method: 'POST',
    body: formData,
    zodSchema: UploadLibraryAlbumCoverResponseSchema,
  });
};
