import type { GetLibraryPlaylistDetailResponse, PlaylistTrackSort } from '@repo/contracts';
import { useQuery } from '@tanstack/react-query';
import { getLibraryPlaylistDetail } from './requests/getLibraryPlaylistDetail';

export const libraryPlaylistDetailQueryKey = (
  playlistId: string,
  page: number,
  limit: number,
  sort?: PlaylistTrackSort,
) => ['library', 'playlists', playlistId, page, limit, sort ?? 'order'] as const;

export const useLibraryPlaylistDetail = (
  playlistId: string,
  params: { page?: number; limit?: number; sort?: PlaylistTrackSort } = {},
) => {
  const { page = 1, limit = 50, sort } = params;
  return useQuery<GetLibraryPlaylistDetailResponse, Error>({
    queryKey: libraryPlaylistDetailQueryKey(playlistId, page, limit, sort),
    queryFn: () => getLibraryPlaylistDetail({ playlistId, page, limit, sort }),
    enabled: !!playlistId,
  });
};
