import { ApiError } from '@/lib/api-error';
import { useLibraryStore } from '@/stores/library.store';
import type { DeleteArtistResponse } from '@repo/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteArtist } from './requests/deleteArtist';

export const useDeleteArtist = () => {
  const queryClient = useQueryClient();
  const setPrivateArtists = useLibraryStore((state) => state.setPrivateArtists);
  const privateArtists = useLibraryStore((state) => state.privateArtists);

  return useMutation<DeleteArtistResponse, ApiError, string>({
    mutationFn: deleteArtist,
    onSuccess: (_, artistId) => {
      // Refresh the list
      queryClient.invalidateQueries({ queryKey: ['artists', 'private'] });
      queryClient.invalidateQueries({ queryKey: ['library', 'artists'] });

      // Update store to keep it in sync
      setPrivateArtists(privateArtists.filter((a) => a.id !== artistId));
    },
  });
};
