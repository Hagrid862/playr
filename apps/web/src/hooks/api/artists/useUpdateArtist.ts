import { ApiError } from '@/lib/api-error';
import { useLibraryStore } from '@/stores/library.store';
import type { UpdateArtistRequest, UpdateArtistResponse } from '@repo/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateArtist } from './requests/updateArtist';

export const useUpdateArtist = () => {
  const queryClient = useQueryClient();
  const setPrivateArtists = useLibraryStore((state) => state.setPrivateArtists);
  const privateArtists = useLibraryStore((state) => state.privateArtists);

  return useMutation<UpdateArtistResponse, ApiError, { id: string; data: UpdateArtistRequest }>({
    mutationFn: ({ id, data }) => updateArtist(id, data),
    onSuccess: (response, { id }) => {
      // Refresh the list and detail queries
      queryClient.invalidateQueries({ queryKey: ['artists', 'private'] });
      queryClient.invalidateQueries({ queryKey: ['library', 'artists'] });
      queryClient.invalidateQueries({ queryKey: ['artists', id] });

      // Update store to keep it in sync
      if (response.data) {
        setPrivateArtists(privateArtists.map((a) => (a.id === id ? response.data! : a)));
      }
    },
  });
};
