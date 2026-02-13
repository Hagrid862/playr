import { useLibraryStore } from '@/stores/library.store';
import type { GetLibraryAlbumsResponseDto } from '@repo/contracts';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getLibraryAlbums } from '../library-albums/requests/getLibraryAlbums';

export const useLibraryAlbums = (page = 1, limit = 20) => {
  const setPrivateAlbums = useLibraryStore((state) => state.setPrivateAlbums);

  const query = useQuery<GetLibraryAlbumsResponseDto, Error>({
    queryKey: ['library', 'albums', page, limit],
    queryFn: () => getLibraryAlbums(page, limit),
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
