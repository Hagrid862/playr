import type { GetLibraryPlaylistDetailResponse } from '@repo/contracts';
import { useQuery } from '@tanstack/react-query';
import { getLibraryPlaylistDetail } from './requests/getLibraryPlaylistDetail';

export const libraryPlaylistDetailQueryKey = (playlistId: string, page: number, limit: number) =>
  ['library', 'playlists', playlistId, page, limit] as const;

export const useLibraryPlaylistDetail = (
  playlistId: string,
  params: { page?: number; limit?: number } = {},
) => {
  const { page = 1, limit = 50 } = params;
  return useQuery<GetLibraryPlaylistDetailResponse, Error>({
    queryKey: libraryPlaylistDetailQueryKey(playlistId, page, limit),
    queryFn: () => getLibraryPlaylistDetail({ playlistId, page, limit }),
    enabled: !!playlistId,
  });
};
