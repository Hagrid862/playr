import { apiClient } from '@/lib/api-client';
import { DeleteLibraryPlaylistResponseSchema, type DeleteLibraryPlaylistResponse } from '@repo/contracts';

export const deleteLibraryPlaylist = (playlistId: string) =>
  apiClient<DeleteLibraryPlaylistResponse>(`library/playlists/${playlistId}`, {
    method: 'DELETE',
    zodSchema: DeleteLibraryPlaylistResponseSchema,
  });
