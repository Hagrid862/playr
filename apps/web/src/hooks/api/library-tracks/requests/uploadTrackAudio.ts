import { apiClient } from '@/lib/api-client';
import { UploadTrackAudioResponse } from '@repo/contracts';

export const uploadTrackAudio = (trackId: string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  return apiClient<UploadTrackAudioResponse>(`library/tracks/${trackId}/audio`, {
    method: 'POST',
    body: formData,
  });
};
