import { apiClient } from '@/lib/api-client';
import {
  ReorderPlaylistPinsResponseSchema,
  type ReorderPlaylistPinsRequest,
  type ReorderPlaylistPinsResponse,
} from '@repo/contracts';

export const reorderPlaylistPins = (body: ReorderPlaylistPinsRequest) =>
  apiClient<ReorderPlaylistPinsResponse>('library/playlist-pins/reorder', {
    method: 'PATCH',
    body,
    zodSchema: ReorderPlaylistPinsResponseSchema,
  });
