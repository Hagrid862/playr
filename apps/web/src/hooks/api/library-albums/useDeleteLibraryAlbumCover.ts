import { ApiError } from '@/lib/api-error';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  invalidateLibraryAlbumsInfinite,
  invalidateLibraryArtistAlbumsInfinite,
} from '../invalidateLibraryInfiniteQueries';
import { deleteLibraryAlbumCover } from './requests/deleteLibraryAlbumCover';
import { DeleteLibraryAlbumCoverResponse } from '@repo/contracts';

export const useDeleteLibraryAlbumCover = () => {
  const queryClient = useQueryClient();

  return useMutation<DeleteLibraryAlbumCoverResponse, ApiError, { id: string }>({
    mutationFn: ({ id }) => deleteLibraryAlbumCover(id),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['library', 'albums', id] });
      queryClient.invalidateQueries({ queryKey: ['library', 'albums'] });
      void invalidateLibraryAlbumsInfinite(queryClient);
      void invalidateLibraryArtistAlbumsInfinite(queryClient);
    },
  });
};
