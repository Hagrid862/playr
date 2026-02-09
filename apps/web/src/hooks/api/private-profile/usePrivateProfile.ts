import type { GetPrivateProfileResponseDto } from '@repo/contracts';
import { useQuery } from '@tanstack/react-query';
import { getPrivateProfile } from './requests/getPrivateProfile';

export const usePrivateProfile = () => {
  return useQuery<GetPrivateProfileResponseDto, Error>({
    queryKey: ['private-profile'],
    queryFn: getPrivateProfile,
    retry: false,
  });
};
