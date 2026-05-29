import { ApiError } from '@/lib/api-error';
import { useLibraryStore } from '@/stores/library.store';
import type { UpdateLibraryAlbumResponse } from '@repo/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  invalidateLibraryAlbumsInfinite,
  invalidateLibraryArtistAlbumsInfinite,
} from '../invalidateLibraryInfiniteQueries';
import { updateLibraryAlbum } from './requests/updateLibraryAlbum';

export const useUpdateLibraryAlbum = () => {
  const queryClient = useQueryClient();
  const setPrivateAlbums = useLibraryStore((state) => state.setPrivateAlbums);
  const privateAlbums = useLibraryStore((state) => state.privateAlbums);

  return useMutation<
    UpdateLibraryAlbumResponse,
    ApiError,
    { id: string; data: Parameters<typeof updateLibraryAlbum>[1] }
  >({
    mutationFn: ({ id, data }) => updateLibraryAlbum(id, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['library', 'albums'] });
      void invalidateLibraryAlbumsInfinite(queryClient);
      void invalidateLibraryArtistAlbumsInfinite(queryClient);

      if (response.data) {
        setPrivateAlbums(
          privateAlbums.map((album) => (album.id === response.data?.id ? response.data : album)),
        );
      }
    },
  });
};
