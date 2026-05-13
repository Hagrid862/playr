import { useLibraryStore } from '@/stores/library.store';
import type { GetLibraryAlbumsResponse } from '@repo/contracts';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getLibraryAlbums } from '../library-albums/requests/getLibraryAlbums';

export const useLibraryAlbums = (
  params: { page?: number; limit?: number; genreId?: string } = {},
) => {
  const { page = 1, limit = 20, genreId } = params;
  const setPrivateAlbums = useLibraryStore((state) => state.setPrivateAlbums);

  const query = useQuery<GetLibraryAlbumsResponse, Error>({
    queryKey: ['library', 'albums', page, limit, genreId],
    queryFn: () => getLibraryAlbums({ page, limit, genreId }),
  });

  useEffect(() => {
    if (genreId) return;
    if (query.data?.data?.items) {
      // Extract albums from the LibraryAlbum relation
      const albums = query.data.data.items
        .map((item) => item.album)
        .filter((album): album is NonNullable<typeof album> => !!album);

      setPrivateAlbums(albums);
    }
  }, [genreId, query.data, setPrivateAlbums]);

  return query;
};
