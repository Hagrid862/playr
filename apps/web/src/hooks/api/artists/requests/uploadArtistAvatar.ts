import { apiClient } from '@/lib/api-client';
import type { UploadArtistAvatarResponse } from '@repo/contracts';
import { UploadArtistAvatarResponseSchema } from '@repo/contracts';

export const uploadArtistAvatar = (id: string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  return apiClient<UploadArtistAvatarResponse>(`artists/${id}/avatar`, {
    method: 'POST',
    body: formData,
    zodSchema: UploadArtistAvatarResponseSchema,
  });
};
