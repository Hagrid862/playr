import { useLibraryStore } from '@/stores/library.store';
import type { GetPrivateArtistsResponse } from '@repo/contracts';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getPrivateArtists } from './requests/getPrivateArtists';

export const usePrivateArtists = () => {
  const setPrivateArtists = useLibraryStore((state) => state.setPrivateArtists);

  const query = useQuery<GetPrivateArtistsResponse, Error>({
    queryKey: ['artists', 'private'],
    queryFn: getPrivateArtists,
  });

  useEffect(() => {
    if (query.data?.data) {
      setPrivateArtists(query.data.data);
    }
  }, [query.data, setPrivateArtists]);

  return query;
};
