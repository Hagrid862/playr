import { ApiError } from '@/lib/api-error';
import type { UploadLibraryArtistAvatarResponse } from '@repo/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadLibraryArtistAvatar } from './requests/uploadLibraryArtistAvatar';

export const useUploadLibraryArtistAvatar = () => {
  const queryClient = useQueryClient();

  return useMutation<UploadLibraryArtistAvatarResponse, ApiError, { id: string; file: File }>({
    mutationFn: ({ id, file }) => uploadLibraryArtistAvatar(id, file),
    onSuccess: (response, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['library', 'artists'] });
      queryClient.invalidateQueries({ queryKey: ['library', 'artists', id] });

      if (response.data) {
        queryClient.fetchQuery({ queryKey: ['library', 'artists', id] });
      }
    },
  });
};
