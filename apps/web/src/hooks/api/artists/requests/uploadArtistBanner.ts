import { apiClient } from '@/lib/api-client';
import type { UploadArtistBannerResponse } from '@repo/contracts';
import { UploadArtistBannerResponseSchema } from '@repo/contracts';

export const uploadArtistBanner = (id: string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  return apiClient<UploadArtistBannerResponse>(`artists/${id}/banner`, {
    method: 'POST',
    body: formData,
    zodSchema: UploadArtistBannerResponseSchema,
  });
};
