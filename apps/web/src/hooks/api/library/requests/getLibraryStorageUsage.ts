import { apiClient } from '@/lib/api-client';
import {
  GetLibraryStorageUsageResponseSchema,
  type GetLibraryStorageUsageResponse,
} from '@repo/contracts';

export const getLibraryStorageUsage = () => {
  return apiClient<GetLibraryStorageUsageResponse>('library/storage-usage', {
    method: 'GET',
    zodSchema: GetLibraryStorageUsageResponseSchema,
  });
};
