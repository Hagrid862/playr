import { useLibraryStore } from '@/stores/library.store';
import type { GetPrivateProfileResponseDto } from '@repo/contracts';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getPrivateProfile } from './requests/getPrivateProfile';

export const usePrivateProfile = () => {
  const setPrivateAccountId = useLibraryStore((state) => state.setPrivateAccountId);

  const query = useQuery<GetPrivateProfileResponseDto, Error>({
    queryKey: ['private-profile'],
    queryFn: getPrivateProfile,
    retry: false,
  });

  useEffect(() => {
    if (query.data?.data?.id) {
      setPrivateAccountId(query.data.data.id);
    }
  }, [query.data, setPrivateAccountId]);

  return query;
};
