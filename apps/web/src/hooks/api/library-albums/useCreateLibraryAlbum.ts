import { ApiError } from '@/lib/api-error';
import { useLibraryStore } from '@/stores/library.store';
import type { CreateLibraryAlbumResponse } from '@repo/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  invalidateLibraryAlbumsInfinite,
  invalidateLibraryArtistAlbumsInfinite,
} from '../invalidateLibraryInfiniteQueries';
import { createLibraryAlbum } from './requests/createLibraryAlbum';

export const useCreateLibraryAlbum = () => {
  const queryClient = useQueryClient();
  const setPrivateAlbums = useLibraryStore((state) => state.setPrivateAlbums);
  const privateAlbums = useLibraryStore((state) => state.privateAlbums);

  return useMutation<
    CreateLibraryAlbumResponse,
    ApiError,
    Parameters<typeof createLibraryAlbum>[0]
  >({
    mutationFn: createLibraryAlbum,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['library', 'albums'] });
      void invalidateLibraryAlbumsInfinite(queryClient);
      void invalidateLibraryArtistAlbumsInfinite(queryClient);

      if (response.data) {
        setPrivateAlbums([...privateAlbums, response.data]);
      }
    },
  });
};
