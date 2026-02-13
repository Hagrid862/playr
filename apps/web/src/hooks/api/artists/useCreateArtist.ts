import { ApiError } from '@/lib/api-error';
import { useLibraryStore } from '@/stores/library.store';
import type { CreateArtistResponse } from '@repo/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createArtist } from './requests/createArtist';

export const useCreateArtist = () => {
  const queryClient = useQueryClient();
  const setPrivateArtists = useLibraryStore((state) => state.setPrivateArtists);
  const privateArtists = useLibraryStore((state) => state.privateArtists);

  return useMutation<CreateArtistResponse, ApiError, Parameters<typeof createArtist>[0]>({
    mutationFn: createArtist,
    onSuccess: (response) => {
      // Optimistically update or just refresh the list
      queryClient.invalidateQueries({ queryKey: ['artists', 'private'] });
      queryClient.invalidateQueries({ queryKey: ['library', 'artists'] });

      // Update store as well if we want to keep it in sync manually
      if (response.data) {
        setPrivateArtists([...privateArtists, response.data]);
      }
    },
  });
};
