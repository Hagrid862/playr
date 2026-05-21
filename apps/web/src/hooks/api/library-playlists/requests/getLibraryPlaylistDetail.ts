import { apiClient } from '@/lib/api-client';
import {
  GetLibraryPlaylistDetailResponseSchema,
  type GetLibraryPlaylistDetailResponse,
  type PlaylistTrackSort,
} from '@repo/contracts';

/** Server query DTO caps `limit` at 100; chunk requests and merge so detail works on all API builds. */
const PLAYLIST_DETAIL_PAGE_SIZE = 100;

export const getLibraryPlaylistDetail = async (params: {
  playlistId: string;
  page?: number;
  limit?: number;
  /** When set, requests that sort from the API (read-only preview). Omit for default manual order. */
  sort?: PlaylistTrackSort;
}) => {
  const { playlistId, sort } = params;
  const mergedTracks: GetLibraryPlaylistDetailResponse['data']['tracks'] = [];
  let first: GetLibraryPlaylistDetailResponse | null = null;
  let serverPage = 1;
  while (true) {
    const query = new URLSearchParams({
      page: String(serverPage),
      limit: String(PLAYLIST_DETAIL_PAGE_SIZE),
    });
    if (sort != null) {
      query.set('sort', sort);
    }
    const endpoint = `library/playlists/${playlistId}?${query.toString()}`;
    const res = await apiClient<GetLibraryPlaylistDetailResponse>(endpoint, {
      method: 'GET',
      zodSchema: GetLibraryPlaylistDetailResponseSchema,
    });
    if (!first) {
      first = res;
    }
    mergedTracks.push(...res.data.tracks);
    const { totalTracks } = res.data;
    if (mergedTracks.length >= totalTracks || res.data.tracks.length === 0) {
      break;
    }
    serverPage += 1;
  }
  if (!first) {
    throw new Error('No playlist detail response');
  }
  return {
    ...first,
    data: {
      ...first.data,
      tracks: mergedTracks,
      page: 1,
      limit: mergedTracks.length,
      totalTracks: first.data.totalTracks,
    },
  };
};
