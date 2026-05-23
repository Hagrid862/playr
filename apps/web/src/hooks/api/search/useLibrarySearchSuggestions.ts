import { useQuery } from '@tanstack/react-query';
import type {
  LibrarySearchSuggestionsQuery,
  LibrarySearchSuggestionsResults,
} from '@repo/contracts';
import { getLibrarySearchSuggestions } from './requests/getLibrarySearchSuggestions';

export const useLibrarySearchSuggestions = (
  query: LibrarySearchSuggestionsQuery,
  options?: { enabled?: boolean },
) => {
  return useQuery<LibrarySearchSuggestionsResults, Error>({
    queryKey: ['library', 'search', 'suggestions', query],
    queryFn: () => getLibrarySearchSuggestions(query),
    enabled: options?.enabled !== false && !!query.query && query.query.length >= 3,
    staleTime: 1000 * 60 * 5,
  });
};
