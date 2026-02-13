import { ApiError } from '@/lib/api-error';
import { useLibraryStore } from '@/stores/library.store';
import type { CreateLibraryArtistResponse } from '@repo/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createLibraryArtist } from './requests/createLibraryArtist';

export const useCreateLibraryArtist = () => {
  const queryClient = useQueryClient();
  const setPrivateArtists = useLibraryStore((state) => state.setPrivateArtists);
  const privateArtists = useLibraryStore((state) => state.privateArtists);

  return useMutation<
    CreateLibraryArtistResponse,
    ApiError,
    Parameters<typeof createLibraryArtist>[0]
  >({
    mutationFn: createLibraryArtist,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['library', 'artists'] });

      if (response.data) {
        setPrivateArtists([...privateArtists, response.data]);
      }
    },
  });
};
