import { apiClient } from '@/lib/api-client';
import {
  GetLibraryTracksResponseSchema,
  type GetLibraryTracksResponse,
  type LibraryTrackListSortBy,
  type LibraryTrackListSortOrder,
} from '@repo/contracts';

export const getLibraryTracks = (
  params: {
    page?: number;
    limit?: number;
    albumId?: string;
    genreId?: string;
    sortBy?: LibraryTrackListSortBy;
    sortOrder?: LibraryTrackListSortOrder;
  } = {},
) => {
  const { page = 1, limit = 20, albumId, genreId, sortBy, sortOrder } = params;
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (albumId) {
    queryParams.append('albumId', albumId);
  }

  if (genreId) {
    queryParams.append('genreId', genreId);
  }

  if (sortBy && sortOrder) {
    queryParams.append('sortBy', sortBy);
    queryParams.append('sortOrder', sortOrder);
  }

  return apiClient<GetLibraryTracksResponse>(`library/tracks?${queryParams.toString()}`, {
    method: 'GET',
    zodSchema: GetLibraryTracksResponseSchema,
  });
};
