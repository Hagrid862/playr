import { apiClient } from '@/lib/api-client';
import {
  GetLibraryPlaylistsResponseSchema,
  type GetLibraryPlaylistsResponse,
} from '@repo/contracts';

export const getLibraryPlaylists = () =>
  apiClient<GetLibraryPlaylistsResponse>('library/playlists', {
    method: 'GET',
    zodSchema: GetLibraryPlaylistsResponseSchema,
  });
