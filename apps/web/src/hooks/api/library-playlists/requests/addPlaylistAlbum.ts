import { apiClient } from '@/lib/api-client';
import {
  AddPlaylistAlbumResponseSchema,
  type AddPlaylistAlbumRequest,
  type AddPlaylistAlbumResponse,
} from '@repo/contracts';

export const addPlaylistAlbum = (params: { playlistId: string; body: AddPlaylistAlbumRequest }) =>
  apiClient<AddPlaylistAlbumResponse>(`library/playlists/${params.playlistId}/albums`, {
    method: 'POST',
    body: params.body,
    zodSchema: AddPlaylistAlbumResponseSchema,
  });
