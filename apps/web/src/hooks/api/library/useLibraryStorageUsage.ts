import type { GetLibraryStorageUsageResponse } from '@repo/contracts';
import { useQuery } from '@tanstack/react-query';
import { getLibraryStorageUsage } from './requests/getLibraryStorageUsage';

export const libraryStorageUsageQueryKey = ['library', 'storage-usage'] as const;

export const useLibraryStorageUsage = (options?: { enabled?: boolean }) => {
  return useQuery<GetLibraryStorageUsageResponse, Error>({
    queryKey: libraryStorageUsageQueryKey,
    queryFn: getLibraryStorageUsage,
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
  });
};
