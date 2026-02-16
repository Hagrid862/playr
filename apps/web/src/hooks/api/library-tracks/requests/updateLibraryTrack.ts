import { apiClient } from '@/lib/api-client';
import {
  UpdateLibraryTrackResponseSchema,
  type UpdateLibraryTrackRequest,
  type UpdateLibraryTrackResponse
} from '@repo/contracts';

export const updateLibraryTrack = (id: string, data: UpdateLibraryTrackRequest) => {
  return apiClient<UpdateLibraryTrackResponse>(
    `library/tracks/${id}`,
    {
      method: 'PATCH',
      body: data,
      zodSchema: UpdateLibraryTrackResponseSchema,
    },
  );
};
