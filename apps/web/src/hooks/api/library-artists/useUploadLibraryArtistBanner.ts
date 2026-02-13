import { ApiError } from '@/lib/api-error';
import type { UploadLibraryArtistBannerResponse } from '@repo/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadLibraryArtistBanner } from './requests/uploadLibraryArtistBanner';

export const useUploadLibraryArtistBanner = () => {
  const queryClient = useQueryClient();

  return useMutation<UploadLibraryArtistBannerResponse, ApiError, { id: string; file: File }>({
    mutationFn: ({ id, file }) => uploadLibraryArtistBanner(id, file),
    onSuccess: (response, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['library', 'artists'] });
      queryClient.invalidateQueries({ queryKey: ['library', 'artists', id] });

      if (response.data) {
        queryClient.fetchQuery({ queryKey: ['library', 'artists', id] });
      }
    },
  });
};
