import { ApiError } from '@/lib/api-error';
import { useLibraryStore } from '@/stores/library.store';
import type { UpdateLibraryArtistRequest, UpdateLibraryArtistResponse } from '@repo/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateLibraryArtist } from './requests/updateLibraryArtist';

export const useUpdateLibraryArtist = () => {
  const queryClient = useQueryClient();
  const setPrivateArtists = useLibraryStore((state) => state.setPrivateArtists);
  const privateArtists = useLibraryStore((state) => state.privateArtists);

  return useMutation<
    UpdateLibraryArtistResponse,
    ApiError,
    { id: string; data: UpdateLibraryArtistRequest }
  >({
    mutationFn: ({ id, data }) => updateLibraryArtist(id, data),
    onSuccess: (response, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['library', 'artists'] });
      queryClient.invalidateQueries({ queryKey: ['library', 'artists', id] });

      if (response.data) {
        setPrivateArtists(privateArtists.map((a) => (a.id === id ? response.data! : a)));
      }
    },
  });
};
