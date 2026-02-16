import {
  type UpdateLibraryTrackRequest,
  type UpdateLibraryTrackResponse,
} from '@repo/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateLibraryTrack } from './requests/updateLibraryTrack';

export const useUpdateLibraryTrack = () => {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateLibraryTrackResponse,
    Error,
    { id: string; data: UpdateLibraryTrackRequest }
  >({
    mutationFn: ({ id, data }) => updateLibraryTrack(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['library', 'tracks'],
      });
      queryClient.invalidateQueries({
        queryKey: ['library', 'tracks', data.data.id],
      });
    },
  });
};
