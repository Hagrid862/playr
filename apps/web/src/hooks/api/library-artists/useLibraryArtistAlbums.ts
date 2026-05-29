import type { GetLibraryArtistAlbumsResponseDto } from '@repo/contracts';
import { AlbumType } from '@repo/db';
import { useQuery } from '@tanstack/react-query';
import { getLibraryArtistAlbums } from './requests/getLibraryArtistAlbums';

export const useLibraryArtistAlbums = (id: string, page = 1, limit = 20, type?: AlbumType) => {
  return useQuery<GetLibraryArtistAlbumsResponseDto, Error>({
    queryKey: ['library', 'artists', id, 'albums', page, limit, type],
    queryFn: () => getLibraryArtistAlbums(id, page, limit, type),
    enabled: !!id,
  });
};
