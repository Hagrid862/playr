import { apiClient } from '@/lib/api-client';
import {
  GetLibraryAlbumTracksResponseSchema,
  type GetLibraryAlbumTracksResponse,
} from '@repo/contracts';

export const getLibraryAlbumTracks = (albumId: string) =>
  apiClient<GetLibraryAlbumTracksResponse>(`library/albums/${albumId}/tracks`, {
    method: 'GET',
    zodSchema: GetLibraryAlbumTracksResponseSchema,
  });
