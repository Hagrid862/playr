import { type GetLibraryTracksResponse } from '@repo/contracts';
import { useQuery } from '@tanstack/react-query';
import { getLibraryTracks } from './requests/getLibraryTracks';

export const useLibraryTracks = (
  params: { page?: number; limit?: number; albumId?: string; genreId?: string } = {},
) => {
  const { page = 1, limit = 20, albumId, genreId } = params;
  return useQuery<GetLibraryTracksResponse, Error>({
    queryKey: ['library', 'tracks', page, limit, albumId, genreId],
    queryFn: () => getLibraryTracks({ page, limit, albumId, genreId }),
  });
};
