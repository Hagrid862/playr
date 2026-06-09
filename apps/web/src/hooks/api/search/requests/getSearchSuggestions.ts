import { apiClient } from '@/lib/api-client';
import {
  SearchSuggestionsResultsSchema,
  type SearchSuggestionsQuery,
  type SearchSuggestionsResults,
} from '@repo/contracts';
import qs from 'qs';

export const getSearchSuggestions = (query: SearchSuggestionsQuery) => {
  const queryString = qs.stringify(query, { allowDots: true, skipNulls: true });

  return apiClient<SearchSuggestionsResults>(`search/suggestions?${queryString}`, {
    method: 'GET',
    zodSchema: SearchSuggestionsResultsSchema,
  });
};
