import { useLibraryStore } from '@/stores/library.store';
import { GetLibraryAlbumResponse } from '@repo/contracts';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getLibraryAlbum } from './requests/getLibraryAlbum';
import { hasProcessingTracks } from './utils/has-processing-tracks';

export const useLibraryAlbum = (id: string) => {
  const updatePrivateAlbum = useLibraryStore((state) => state.updatePrivateAlbum);

  const query = useQuery<GetLibraryAlbumResponse, Error>({
    queryKey: ['library', 'albums', id],
    queryFn: () => getLibraryAlbum(id),
    enabled: !!id,
    refetchInterval: (query) => (hasProcessingTracks(query.state.data) ? 3000 : false),
  });

  useEffect(() => {
    if (query.data?.data) {
      updatePrivateAlbum(query.data.data);
    }
  }, [query.data, updatePrivateAlbum]);

  return query;
};
