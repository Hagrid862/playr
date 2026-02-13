import { apiClient } from '@/lib/api-client';
import type { CreateLibraryRequestDto, CreateLibraryResponseDto } from '@repo/contracts';
import { CreateLibraryResponseSchema } from '@repo/contracts';

export const createLibrary = (data: CreateLibraryRequestDto) => {
  return apiClient<CreateLibraryResponseDto>('library', {
    method: 'POST',
    body: data,
    zodSchema: CreateLibraryResponseSchema,
  });
};
