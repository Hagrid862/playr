import { apiClient } from '@/lib/api-client';
import { SearchResultsResponseSchema, type SearchQuery, type SearchResultsResponse } from '@repo/contracts';
import qs from 'qs';

export const getSearch = (query: SearchQuery) => {
  const queryString = qs.stringify(query, { allowDots: true, skipNulls: true });

  return apiClient<SearchResultsResponse>(`search?${queryString}`, {
    method: 'GET',
    zodSchema: SearchResultsResponseSchema,
  });
};
