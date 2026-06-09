import { useQuery } from '@tanstack/react-query';
import type { SearchQuery, SearchResultsResponse } from '@repo/contracts';
import { getSearch } from './requests/getSearch';

export const useSearch = (query: SearchQuery, options?: { enabled?: boolean }) => {
  return useQuery<SearchResultsResponse, Error>({
    queryKey: ['search', query],
    queryFn: () => getSearch(query),
    enabled: options?.enabled !== false && !!query.query && query.query.length >= 3,
  });
};
