import { ApiError } from '@/lib/api-error';
import { useLibraryStore } from '@/stores/library.store';
import type { UpdateLibraryArtistRequest, UpdateLibraryArtistResponse } from '@repo/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  invalidateLibraryArtistAlbumsInfinite,
  invalidateLibraryArtistsInfinite,
} from '../invalidateLibraryInfiniteQueries';
import { updateLibraryArtist } from './requests/updateLibraryArtist';

export const useUpdateLibraryArtist = () => {
  const queryClient = useQueryClient();
  const updatePrivateArtist = useLibraryStore((state) => state.updatePrivateArtist);

  return useMutation<
    UpdateLibraryArtistResponse,
    ApiError,
    { id: string; data: UpdateLibraryArtistRequest }
  >({
    mutationFn: ({ id, data }) => updateLibraryArtist(id, data),
    onSuccess: (response, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['library', 'artists'] });
      queryClient.invalidateQueries({ queryKey: ['library', 'artists', id] });
      void invalidateLibraryArtistsInfinite(queryClient);
      void invalidateLibraryArtistAlbumsInfinite(queryClient, id);

      if (response.data) {
        updatePrivateArtist(response.data);
      }
    },
  });
};
