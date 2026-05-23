import { useQuery } from '@tanstack/react-query';
import type { LibrarySearchQuery, LibrarySearchResultsResponse } from '@repo/contracts';
import { getLibrarySearch } from './requests/getLibrarySearch';

export const useLibrarySearch = (query: LibrarySearchQuery, options?: { enabled?: boolean }) => {
  return useQuery<LibrarySearchResultsResponse, Error>({
    queryKey: ['library', 'search', query],
    queryFn: () => getLibrarySearch(query),
    enabled: options?.enabled !== false && !!query.query && query.query.length >= 3,
  });
};
