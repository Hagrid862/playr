import type { GetLibraryResponseDto } from '@repo/contracts';
import { useQuery } from '@tanstack/react-query';
import { getLibrary } from './requests/getLibrary';

export const useLibrary = () => {
  return useQuery<GetLibraryResponseDto, Error>({
    queryKey: ['library'],
    queryFn: getLibrary,
    retry: false, // Don't retry if library is not found (404)
  });
};
