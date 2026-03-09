import { type GetLibraryTrackResponse } from '@repo/contracts';
import { useQuery } from '@tanstack/react-query';
import { getLibraryTrack } from './requests/getLibraryTrack';

export const useLibraryTrack = (id?: string) => {
  return useQuery<GetLibraryTrackResponse, Error>({
    queryKey: ['library', 'tracks', id],
    queryFn: () => getLibraryTrack(id!),
    enabled: !!id,
  });
};
