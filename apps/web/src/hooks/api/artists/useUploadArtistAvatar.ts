import { ApiError } from '@/lib/api-error';
import type { UploadArtistAvatarResponse } from '@repo/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadArtistAvatar } from './requests/uploadArtistAvatar';

export const useUploadArtistAvatar = () => {
  const queryClient = useQueryClient();

  return useMutation<UploadArtistAvatarResponse, ApiError, { id: string; file: File }>({
    mutationFn: ({ id, file }) => uploadArtistAvatar(id, file),
    onSuccess: (_response, { id }) => {
      // Invalidate relevant queries to fetch fresh data with new avatar URL
      queryClient.invalidateQueries({ queryKey: ['artists', id] });
      queryClient.invalidateQueries({ queryKey: ['artists', 'private'] });
      queryClient.invalidateQueries({ queryKey: ['library', 'artists'] });
    },
  });
};
