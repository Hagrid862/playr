import { type DeleteLibraryTrackResponse } from '@repo/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteLibraryTrack } from './requests/deleteLibraryTrack';

export const useDeleteLibraryTrack = () => {
  const queryClient = useQueryClient();

  return useMutation<DeleteLibraryTrackResponse, Error, string>({
    mutationFn: deleteLibraryTrack,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['library', 'tracks'],
      });
      queryClient.removeQueries({
        queryKey: ['library', 'tracks', data.data.id],
      });
      const albumIdVal = (data.data as { albumId?: string }).albumId;
      if (albumIdVal) {
        queryClient.invalidateQueries({
          queryKey: ['library', 'albums', albumIdVal],
        });
      }
    },
  });
};
