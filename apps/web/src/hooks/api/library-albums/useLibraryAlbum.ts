import { GetLibraryAlbumResponse } from '@repo/contracts';
import { useQuery } from '@tanstack/react-query';
import { getLibraryAlbum } from './requests/getLibraryAlbum';

export const useLibraryAlbum = (id: string) => {
  return useQuery<GetLibraryAlbumResponse, Error>({
    queryKey: ['library', 'albums', id],
    queryFn: () => getLibraryAlbum(id),
    enabled: !!id,
  });
};
