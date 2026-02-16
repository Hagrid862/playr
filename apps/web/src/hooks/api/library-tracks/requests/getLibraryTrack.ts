import { apiClient } from '@/lib/api-client';
import {
  GetLibraryTrackResponseSchema,
  type GetLibraryTrackResponse,
} from '@repo/contracts';

export const getLibraryTrack = (id: string) => {
  return apiClient<GetLibraryTrackResponse>(`library/tracks/${id}`, {
    method: 'GET',
    zodSchema: GetLibraryTrackResponseSchema,
  });
};
