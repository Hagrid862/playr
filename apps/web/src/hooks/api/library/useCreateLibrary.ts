import type { CreateLibraryRequestDto, CreateLibraryResponseDto } from '@repo/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createLibrary } from './requests/createLibrary';

export const useCreateLibrary = () => {
  const queryClient = useQueryClient();

  return useMutation<CreateLibraryResponseDto, Error, CreateLibraryRequestDto>({
    mutationFn: createLibrary,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library'] });
    },
  });
};
