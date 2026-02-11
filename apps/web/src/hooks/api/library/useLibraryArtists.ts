import { useLibraryStore } from '@/stores/library.store';
import type { GetLibraryArtistsResponseDto } from '@repo/contracts';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getLibraryArtists } from './requests/getLibraryArtists';

export const useLibraryArtists = (page = 1, limit = 20) => {
  const setPrivateArtists = useLibraryStore((state) => state.setPrivateArtists);

  const query = useQuery<GetLibraryArtistsResponseDto, Error>({
    queryKey: ['library', 'artists', page, limit],
    queryFn: () => getLibraryArtists(page, limit),
  });

  useEffect(() => {
    if (query.data?.data?.items) {
      // Extract artists from the LibraryArtist relation
      const artists = query.data.data.items
        .map((item) => item.artist)
        .filter((artist): artist is NonNullable<typeof artist> => !!artist);

      setPrivateArtists(artists);
    }
  }, [query.data, setPrivateArtists]);

  return query;
};
