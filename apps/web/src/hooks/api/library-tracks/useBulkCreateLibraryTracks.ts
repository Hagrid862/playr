import type {
  BulkCreateLibraryTracksResponse,
  BulkUploadTrackAudioResponse,
} from '@repo/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bulkCreateLibraryTracks } from './requests/bulkCreateLibraryTracks';
import type { BulkCreateLibraryTracksParams } from './requests/bulkCreateLibraryTracks';

export type BulkCreateLibraryTracksResult = {
  createResponse: BulkCreateLibraryTracksResponse;
  uploadResponse: BulkUploadTrackAudioResponse;
};

export const useBulkCreateLibraryTracks = () => {
  const queryClient = useQueryClient();

  return useMutation<BulkCreateLibraryTracksResult, Error, BulkCreateLibraryTracksParams>({
    mutationFn: bulkCreateLibraryTracks,
    onSuccess: (_, { album }) => {
      queryClient.invalidateQueries({
        queryKey: ['library', 'tracks'],
      });
      queryClient.invalidateQueries({
        queryKey: ['library', 'albums', album.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['library', 'albums'],
      });
    },
  });
};
