import { apiClient } from '@/lib/api-client';
import type { GetLibraryResponseDto } from '@repo/contracts';
import { GetLibraryResponseSchema } from '@repo/contracts';

export const getLibrary = () => {
  return apiClient<GetLibraryResponseDto>('library', {
    method: 'GET',
    zodSchema: GetLibraryResponseSchema,
  });
};
