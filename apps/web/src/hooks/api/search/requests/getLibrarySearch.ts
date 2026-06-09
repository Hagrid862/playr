import { apiClient } from '@/lib/api-client';
import {
  LibrarySearchResultsResponseSchema,
  type LibrarySearchQuery,
  type LibrarySearchResultsResponse,
} from '@repo/contracts';
import qs from 'qs';

export const getLibrarySearch = (query: LibrarySearchQuery) => {
  const queryString = qs.stringify(query, { allowDots: true, skipNulls: true });

  return apiClient<LibrarySearchResultsResponse>(`search/library?${queryString}`, {
    method: 'GET',
    zodSchema: LibrarySearchResultsResponseSchema,
  });
};
