import type { GetLibraryPlaylistPinsResponse } from '@repo/contracts';
import { useQuery } from '@tanstack/react-query';
import { getLibraryPlaylistPins } from './requests/getLibraryPlaylistPins';

export const libraryPlaylistPinsQueryKey = ['library', 'playlist-pins'] as const;

export const useLibraryPlaylistPins = () =>
  useQuery<GetLibraryPlaylistPinsResponse, Error>({
    queryKey: libraryPlaylistPinsQueryKey,
    queryFn: () => getLibraryPlaylistPins(),
  });
