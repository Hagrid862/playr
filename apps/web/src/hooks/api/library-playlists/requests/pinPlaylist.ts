import { apiClient } from '@/lib/api-client';
import {
  PinPlaylistResponseSchema,
  type PinPlaylistRequest,
  type PinPlaylistResponse,
} from '@repo/contracts';

export const pinPlaylist = (body: PinPlaylistRequest) =>
  apiClient<PinPlaylistResponse>('library/playlist-pins', {
    method: 'POST',
    body,
    zodSchema: PinPlaylistResponseSchema,
  });
