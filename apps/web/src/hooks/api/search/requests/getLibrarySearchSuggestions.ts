import { apiClient } from '@/lib/api-client';
import {
  LibrarySearchSuggestionsResultsSchema,
  type LibrarySearchSuggestionsQuery,
  type LibrarySearchSuggestionsResults,
} from '@repo/contracts';
import qs from 'qs';

export const getLibrarySearchSuggestions = (query: LibrarySearchSuggestionsQuery) => {
  const queryString = qs.stringify(query, { allowDots: true, skipNulls: true });

  return apiClient<LibrarySearchSuggestionsResults>(`search/library-suggestions?${queryString}`, {
    method: 'GET',
    zodSchema: LibrarySearchSuggestionsResultsSchema,
  });
};
