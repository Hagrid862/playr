import {
  type GetLibraryTracksResponse,
  type LibraryTrackListSortBy,
  type LibraryTrackListSortOrder,
} from '@repo/contracts';
import { useQuery } from '@tanstack/react-query';
import { getLibraryTracks } from './requests/getLibraryTracks';

export const useLibraryTracks = (
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
  const sortKey = sortBy && sortOrder ? `${sortBy}:${sortOrder}` : 'default';

  return useQuery<GetLibraryTracksResponse, Error>({
    queryKey: ['library', 'tracks', page, limit, albumId, genreId, sortKey],
    queryFn: () =>
      getLibraryTracks({
        page,
        limit,
        albumId,
        genreId,
        ...(sortBy && sortOrder ? { sortBy, sortOrder } : {}),
      }),
  });
};
