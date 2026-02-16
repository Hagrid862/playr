import {
  type CreateLibraryTrackRequest,
  type CreateLibraryTrackResponse,
} from '@repo/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createLibraryTrack } from './requests/createLibraryTrack';

export const useCreateLibraryTrack = () => {
  const queryClient = useQueryClient();

  return useMutation<
    CreateLibraryTrackResponse,
    Error,
    CreateLibraryTrackRequest
  >({
    mutationFn: createLibraryTrack,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['library', 'tracks'],
      });
    },
  });
};
