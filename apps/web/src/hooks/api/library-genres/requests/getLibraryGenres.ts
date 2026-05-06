import { apiClient } from '@/lib/api-client';
import type { GetLibraryGenresRequest, GetLibraryGenresResponse } from '@repo/contracts';
import { GetLibraryGenresResponseSchema } from '@repo/contracts';

export const getLibraryGenres = (params: GetLibraryGenresRequest) => {
  const search = new URLSearchParams();
  search.set('page', String(params.page ?? 1));
  search.set('limit', String(params.limit ?? 20));
  if (params.query != null && params.query !== '') {
    search.set('query', params.query);
  }
  if (params.kind != null) {
    search.set('kind', params.kind);
  }
  return apiClient<GetLibraryGenresResponse>(`library/genres?${search.toString()}`, {
    method: 'GET',
    zodSchema: GetLibraryGenresResponseSchema,
  });
};
