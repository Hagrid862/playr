import { apiClient } from '@/lib/api-client';
import {
  GetLibraryPlaylistPinsResponseSchema,
  type GetLibraryPlaylistPinsResponse,
} from '@repo/contracts';

export const getLibraryPlaylistPins = () =>
  apiClient<GetLibraryPlaylistPinsResponse>('library/playlist-pins', {
    method: 'GET',
    zodSchema: GetLibraryPlaylistPinsResponseSchema,
  });
