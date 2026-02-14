import { apiClient } from '@/lib/api-client';
import type { GetLibraryResponse } from '@repo/contracts';
import { GetLibraryResponseSchema } from '@repo/contracts';

export const getLibrary = () => {
  return apiClient<GetLibraryResponse>('library', {
    method: 'GET',
    zodSchema: GetLibraryResponseSchema,
  });
};
