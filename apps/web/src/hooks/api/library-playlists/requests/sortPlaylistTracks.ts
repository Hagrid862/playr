import { apiClient } from '@/lib/api-client';
import {
  SortPlaylistTracksResponseSchema,
  type SortPlaylistTracksRequest,
  type SortPlaylistTracksResponse,
} from '@repo/contracts';

export const sortPlaylistTracks = (params: {
  playlistId: string;
  body: SortPlaylistTracksRequest;
}) =>
  apiClient<SortPlaylistTracksResponse>(`library/playlists/${params.playlistId}/tracks/sort`, {
    method: 'PATCH',
    body: params.body,
    zodSchema: SortPlaylistTracksResponseSchema,
  });
