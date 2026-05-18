import type { GetLibraryPlaylistsResponse } from '@repo/contracts';
import { useQuery } from '@tanstack/react-query';
import { getLibraryPlaylists } from './requests/getLibraryPlaylists';

export const libraryPlaylistsQueryKey = ['library', 'playlists'] as const;

export const useLibraryPlaylists = () =>
  useQuery<GetLibraryPlaylistsResponse, Error>({
    queryKey: libraryPlaylistsQueryKey,
    queryFn: () => getLibraryPlaylists(),
  });
