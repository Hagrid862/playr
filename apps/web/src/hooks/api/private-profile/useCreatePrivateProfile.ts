import type { CreatePrivateProfileResponseDto } from '@repo/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPrivateProfile } from './requests/createPrivateProfile';

export const useCreatePrivateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation<CreatePrivateProfileResponseDto, Error>({
    mutationFn: createPrivateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['private-profile'] });
    },
  });
};
