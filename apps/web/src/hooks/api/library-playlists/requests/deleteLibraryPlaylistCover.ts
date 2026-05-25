import { apiClient } from '@/lib/api-client';
import {
  DeleteLibraryPlaylistCoverResponseSchema,
  type DeleteLibraryPlaylistCoverResponse,
} from '@repo/contracts';

export const deleteLibraryPlaylistCover = (playlistId: string) =>
  apiClient<DeleteLibraryPlaylistCoverResponse>(`library/playlists/${playlistId}/cover`, {
    method: 'DELETE',
    zodSchema: DeleteLibraryPlaylistCoverResponseSchema,
  });
