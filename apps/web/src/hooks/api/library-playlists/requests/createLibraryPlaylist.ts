import { apiClient } from '@/lib/api-client';
import {
  CreateLibraryPlaylistResponseSchema,
  type CreateLibraryPlaylistRequest,
  type CreateLibraryPlaylistResponse,
} from '@repo/contracts';

export const createLibraryPlaylist = (body: CreateLibraryPlaylistRequest) =>
  apiClient<CreateLibraryPlaylistResponse>('library/playlists', {
    method: 'POST',
    body,
    zodSchema: CreateLibraryPlaylistResponseSchema,
  });
