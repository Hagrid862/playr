import { apiClient } from '@/lib/api-client';
import {
  AddPlaylistTrackResponseSchema,
  type AddPlaylistTrackRequest,
  type AddPlaylistTrackResponse,
} from '@repo/contracts';

export const addPlaylistTrack = (params: { playlistId: string; body: AddPlaylistTrackRequest }) =>
  apiClient<AddPlaylistTrackResponse>(`library/playlists/${params.playlistId}/tracks`, {
    method: 'POST',
    body: params.body,
    zodSchema: AddPlaylistTrackResponseSchema,
  });
