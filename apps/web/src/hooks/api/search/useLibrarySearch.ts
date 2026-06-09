import { useQuery } from '@tanstack/react-query';
import type { LibrarySearchQuery, LibrarySearchResultsResponse } from '@repo/contracts';
import { getLibrarySearch } from './requests/getLibrarySearch';

export const useLibrarySearch = (query: LibrarySearchQuery, options?: { enabled?: boolean }) => {
  const trimmedQuery = query.query?.trim() ?? '';
  const normalizedQuery = { ...query, query: trimmedQuery };

  return useQuery<LibrarySearchResultsResponse, Error>({
    queryKey: ['library', 'search', normalizedQuery],
    queryFn: () => getLibrarySearch(normalizedQuery),
    enabled: options?.enabled !== false && trimmedQuery.length >= 3,
  });
};
