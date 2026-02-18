import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadTrackAudio } from './requests/uploadTrackAudio';
import { UploadTrackAudioResponse } from '@repo/contracts';

interface UploadTrackAudioParams {
  trackId: string;
  file: File;
}

export const useUploadTrackAudio = () => {
  const queryClient = useQueryClient();

  return useMutation<UploadTrackAudioResponse, Error, UploadTrackAudioParams>({
    mutationFn: ({ trackId, file }) => uploadTrackAudio(trackId, file),
    onSuccess: (_, { trackId }) => {
      queryClient.invalidateQueries({
        queryKey: ['library', 'tracks', trackId],
      });
    },
  });
};
