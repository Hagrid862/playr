import type { GetLibraryArtistResponseDto } from '@repo/contracts';
import { useQuery } from '@tanstack/react-query';
import { getLibraryArtist } from './requests/getLibraryArtist';

export const useLibraryArtist = (id: string) => {
  return useQuery<GetLibraryArtistResponseDto, Error>({
    queryKey: ['library', 'artists', id],
    queryFn: () => getLibraryArtist(id),
    enabled: !!id,
  });
};
