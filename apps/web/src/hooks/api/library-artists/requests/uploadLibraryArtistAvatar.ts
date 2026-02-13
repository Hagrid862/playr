import { apiClient } from '@/lib/api-client';
import type { UploadLibraryArtistAvatarResponse } from '@repo/contracts';
import { UploadLibraryArtistAvatarResponseSchema } from '@repo/contracts';

export const uploadLibraryArtistAvatar = (id: string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  return apiClient<UploadLibraryArtistAvatarResponse>(`library/artists/${id}/avatar`, {
    method: 'POST',
    body: formData,
    zodSchema: UploadLibraryArtistAvatarResponseSchema,
  });
};
