import { type GetLibraryTracksResponse } from '@repo/contracts';
import { useQuery } from '@tanstack/react-query';
import { getLibraryTracks } from './requests/getLibraryTracks';

export const useLibraryTracks = (page = 1, limit = 20, albumId?: string) => {
  return useQuery<GetLibraryTracksResponse, Error>({
    queryKey: ['library', 'tracks', page, limit, albumId],
    queryFn: () => getLibraryTracks(page, limit, albumId),
  });
};
