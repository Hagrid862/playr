import { useLibraryStore } from '@/stores/library.store';
import type { GetLibraryArtistResponseDto } from '@repo/contracts';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getLibraryArtist } from './requests/getLibraryArtist';

export const useLibraryArtist = (id: string) => {
  const updatePrivateArtist = useLibraryStore((state) => state.updatePrivateArtist);

  const query = useQuery<GetLibraryArtistResponseDto, Error>({
    queryKey: ['library', 'artists', id],
    queryFn: () => getLibraryArtist(id),
    enabled: !!id,
  });

  useEffect(() => {
    if (query.data?.data?.artist) {
      updatePrivateArtist(query.data.data.artist);
    }
  }, [query.data, updatePrivateArtist]);

  return query;
};
