import { ApiError } from '@/lib/api-error';
import type { UploadArtistBannerResponse } from '@repo/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadArtistBanner } from './requests/uploadArtistBanner';

export const useUploadArtistBanner = () => {
  const queryClient = useQueryClient();

  return useMutation<UploadArtistBannerResponse, ApiError, { id: string; file: File }>({
    mutationFn: ({ id, file }) => uploadArtistBanner(id, file),
    onSuccess: (_response, { id }) => {
      // Invalidate relevant queries to fetch fresh data with new banner URL
      queryClient.invalidateQueries({ queryKey: ['artists', id] });
      queryClient.invalidateQueries({ queryKey: ['artists', 'private'] });
      queryClient.invalidateQueries({ queryKey: ['library', 'artists'] });
    },
  });
};
