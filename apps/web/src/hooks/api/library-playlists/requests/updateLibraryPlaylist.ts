import { apiClient } from '@/lib/api-client';
import {
  UpdateLibraryPlaylistResponseSchema,
  type UpdateLibraryPlaylistRequest,
  type UpdateLibraryPlaylistResponse,
} from '@repo/contracts';

export const updateLibraryPlaylist = (params: {
  playlistId: string;
  body: UpdateLibraryPlaylistRequest;
}) =>
  apiClient<UpdateLibraryPlaylistResponse>(`library/playlists/${params.playlistId}`, {
    method: 'PATCH',
    body: params.body,
    zodSchema: UpdateLibraryPlaylistResponseSchema,
  });
