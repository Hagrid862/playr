import { apiClient } from '@/lib/api-client';
import {
  CreateLibraryTrackResponseSchema,
  type CreateLibraryTrackRequest,
  type CreateLibraryTrackResponse
} from '@repo/contracts';

export const createLibraryTrack = (data: CreateLibraryTrackRequest) => {
  return apiClient<CreateLibraryTrackResponse>(
    'library/tracks',
    {
      method: 'POST',
      body: data,
      zodSchema: CreateLibraryTrackResponseSchema,
    },
  );
};
