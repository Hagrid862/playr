import { apiClient } from '@/lib/api-client';
import { UnpinPlaylistResponseSchema, type UnpinPlaylistResponse } from '@repo/contracts';

export const unpinPlaylist = (pinId: string) =>
  apiClient<UnpinPlaylistResponse>(`library/playlist-pins/${pinId}`, {
    method: 'DELETE',
    zodSchema: UnpinPlaylistResponseSchema,
  });
