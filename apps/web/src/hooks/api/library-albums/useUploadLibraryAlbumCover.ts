import { ApiError } from '@/lib/api-error';
import type { UploadLibraryAlbumCoverResponse } from '@repo/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  invalidateLibraryAlbumsInfinite,
  invalidateLibraryArtistAlbumsInfinite,
} from '../invalidateLibraryInfiniteQueries';
import { uploadLibraryAlbumCover } from './requests/uploadLibraryAlbumCover';

export const useUploadLibraryAlbumCover = () => {
  const queryClient = useQueryClient();

  return useMutation<UploadLibraryAlbumCoverResponse, ApiError, { id: string; file: File }>({
    mutationFn: ({ id, file }) => uploadLibraryAlbumCover(id, file),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['library', 'albums', id] });
      queryClient.invalidateQueries({ queryKey: ['library', 'albums'] });
      void invalidateLibraryAlbumsInfinite(queryClient);
      void invalidateLibraryArtistAlbumsInfinite(queryClient);
    },
  });
};
