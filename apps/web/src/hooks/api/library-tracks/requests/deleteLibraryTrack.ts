import { apiClient } from '@/lib/api-client';
import {
  DeleteLibraryTrackResponseSchema,
  type DeleteLibraryTrackResponse
} from '@repo/contracts';

export const deleteLibraryTrack = (id: string) => {
  return apiClient<DeleteLibraryTrackResponse>(`library/tracks/${id}`, {
    method: 'DELETE',
    zodSchema: DeleteLibraryTrackResponseSchema,
  });
};
