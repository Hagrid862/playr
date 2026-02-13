import { apiClient } from '@/lib/api-client';
import type { UploadLibraryArtistBannerResponse } from '@repo/contracts';
import { UploadLibraryArtistBannerResponseSchema } from '@repo/contracts';

export const uploadLibraryArtistBanner = (id: string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  return apiClient<UploadLibraryArtistBannerResponse>(`library/artists/${id}/banner`, {
    method: 'POST',
    body: formData,
    zodSchema: UploadLibraryArtistBannerResponseSchema,
  });
};
