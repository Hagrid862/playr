import { apiClient } from '@/lib/api-client';
import type { CreateLibraryRequest, CreateLibraryResponse } from '@repo/contracts';
import { CreateLibraryResponseSchema } from '@repo/contracts';

export const createLibrary = (data: CreateLibraryRequest) => {
  return apiClient<CreateLibraryResponse>('library', {
    method: 'POST',
    body: data,
    zodSchema: CreateLibraryResponseSchema,
  });
};
