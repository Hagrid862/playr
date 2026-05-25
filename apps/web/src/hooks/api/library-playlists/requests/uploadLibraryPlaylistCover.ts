import { apiClient } from '@/lib/api-client';
import {
  UploadLibraryPlaylistCoverResponseSchema,
  type UploadLibraryPlaylistCoverResponse,
} from '@repo/contracts';

export const uploadLibraryPlaylistCover = (playlistId: string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  return apiClient<UploadLibraryPlaylistCoverResponse>(`library/playlists/${playlistId}/cover`, {
    method: 'POST',
    body: formData,
    zodSchema: UploadLibraryPlaylistCoverResponseSchema,
  });
};
