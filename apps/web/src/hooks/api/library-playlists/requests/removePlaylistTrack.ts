import { apiClient } from '@/lib/api-client';
import {
  RemovePlaylistTrackResponseSchema,
  type RemovePlaylistTrackResponse,
} from '@repo/contracts';

export const removePlaylistTrack = (params: { playlistId: string; trackId: string }) =>
  apiClient<RemovePlaylistTrackResponse>(
    `library/playlists/${params.playlistId}/tracks/${params.trackId}`,
    {
      method: 'DELETE',
      zodSchema: RemovePlaylistTrackResponseSchema,
    },
  );
