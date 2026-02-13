import { useLibraryStore } from '@/stores/library.store';
import type { CreatePrivateProfileResponseDto } from '@repo/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPrivateProfile } from './requests/createPrivateProfile';

export const useCreatePrivateProfile = () => {
  const queryClient = useQueryClient();
  const setPrivateAccountId = useLibraryStore((state) => state.setPrivateAccountId);

  return useMutation<CreatePrivateProfileResponseDto, Error>({
    mutationFn: createPrivateProfile,
    onSuccess: (response) => {
      if (response.data?.id) {
        setPrivateAccountId(response.data.id);
      }
      queryClient.invalidateQueries({ queryKey: ['private-profile'] });
    },
  });
};
