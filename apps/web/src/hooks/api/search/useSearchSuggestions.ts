import { useQuery } from '@tanstack/react-query';
import type { SearchSuggestionsQuery, SearchSuggestionsResults } from '@repo/contracts';
import { getSearchSuggestions } from './requests/getSearchSuggestions';

export const useSearchSuggestions = (
  query: SearchSuggestionsQuery,
  options?: { enabled?: boolean },
) => {
  return useQuery<SearchSuggestionsResults, Error>({
    queryKey: ['search', 'suggestions', query],
    queryFn: () => getSearchSuggestions(query),
    enabled: options?.enabled !== false && !!query.query && query.query.trim().length >= 3,
    staleTime: 1000 * 60 * 5, // Suggestions can be cached for 5 minutes
  });
};
