import { useLibraryStore } from '@/stores/library.store';
import type { GetLibraryArtistAlbumsResponseDto } from '@repo/contracts';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getLibraryArtistAlbums } from './requests/getLibraryArtistAlbums';
import { AlbumType } from '@repo/db';

export const useLibraryArtistAlbums = (id: string, page = 1, limit = 20, type?: AlbumType) => {
  const setPrivateAlbums = useLibraryStore((state) => state.setPrivateAlbums);

  const query = useQuery<GetLibraryArtistAlbumsResponseDto, Error>({
    queryKey: ['library', 'artists', id, 'albums', page, limit],
    queryFn: () => getLibraryArtistAlbums(id, page, limit),
    enabled: !!id,
  });

  useEffect(() => {
    if (query.data?.data?.items) {
      // Extract albums from the LibraryAlbum relation
      const albums = query.data.data.items
        .map((item) => item.album)
        .filter((album): album is NonNullable<typeof album> => !!album);

      setPrivateAlbums(albums);
    }
  }, [query.data, setPrivateAlbums]);

  return query;
};
