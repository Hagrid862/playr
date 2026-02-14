import { useLibraryStore } from '@/stores/library.store';
import type { GetLibraryResponse } from '@repo/contracts';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getLibrary } from './requests/getLibrary';

export const useLibrary = () => {
  const setLibraryId = useLibraryStore((state) => state.setLibraryId);

  const query = useQuery<GetLibraryResponse, Error>({
    queryKey: ['library'],
    queryFn: getLibrary,
    retry: false, // Don't retry if library is not found (404)
  });

  useEffect(() => {
    if (query.data?.data?.id) {
      setLibraryId(query.data.data.id);
    }
  }, [query.data, setLibraryId]);

  return query;
};
