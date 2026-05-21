import { apiClient } from '@/lib/api-client';
import {
  ReorderPlaylistTracksResponseSchema,
  type ReorderPlaylistTracksRequest,
  type ReorderPlaylistTracksResponse,
} from '@repo/contracts';

export const reorderPlaylistTracks = (params: {
  playlistId: string;
  body: ReorderPlaylistTracksRequest;
}) =>
  apiClient<ReorderPlaylistTracksResponse>(
    `library/playlists/${params.playlistId}/tracks/reorder`,
    {
      method: 'PATCH',
      body: params.body,
      zodSchema: ReorderPlaylistTracksResponseSchema,
    },
  );
