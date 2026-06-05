import { ApiError } from '@/lib/api-error';
import { useLibraryStore } from '@/stores/library.store';
import type { DeleteLibraryAlbumResponse } from '@repo/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  invalidateLibraryAlbumsInfinite,
  invalidateLibraryArtistAlbumsInfinite,
} from '../invalidateLibraryInfiniteQueries';
import { deleteLibraryAlbum } from './requests/deleteLibraryAlbum';

export const useDeleteLibraryAlbum = () => {
  const queryClient = useQueryClient();
  const setPrivateAlbums = useLibraryStore((state) => state.setPrivateAlbums);
  const privateAlbums = useLibraryStore((state) => state.privateAlbums);

  return useMutation<DeleteLibraryAlbumResponse, ApiError, { id: string; keepTracks?: boolean }>({
    mutationFn: ({ id, keepTracks }) => deleteLibraryAlbum(id, { keepTracks }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['library', 'albums'] });
      void invalidateLibraryAlbumsInfinite(queryClient);
      void invalidateLibraryArtistAlbumsInfinite(queryClient);

      if (response.data) {
        setPrivateAlbums(privateAlbums.filter((album) => album.id !== response.data?.id));
      }
    },
  });
};
