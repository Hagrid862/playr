import { ApiError } from '@/lib/api-error';
import { useLibraryStore } from '@/stores/library.store';
import type { DeleteLibraryArtistResponse } from '@repo/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteLibraryArtist } from './requests/deleteLibraryArtist';

export const useDeleteLibraryArtist = () => {
  const queryClient = useQueryClient();
  const setPrivateArtists = useLibraryStore((state) => state.setPrivateArtists);
  const privateArtists = useLibraryStore((state) => state.privateArtists);

  return useMutation<DeleteLibraryArtistResponse, ApiError, string>({
    mutationFn: deleteLibraryArtist,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['library', 'artists'] });
      queryClient.invalidateQueries({ queryKey: ['library', 'artists', id] });

      setPrivateArtists(privateArtists.filter((a) => a.id !== id));
    },
  });
};
