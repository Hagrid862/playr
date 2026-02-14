import { useLibraryStore } from '@/stores/library.store';
import type { CreateLibraryRequest, CreateLibraryResponse } from '@repo/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createLibrary } from './requests/createLibrary';

export const useCreateLibrary = () => {
  const queryClient = useQueryClient();
  const setLibraryId = useLibraryStore((state) => state.setLibraryId);

  return useMutation<CreateLibraryResponse, Error, CreateLibraryRequest>({
    mutationFn: createLibrary,
    onSuccess: (response) => {
      if (response.data?.id) {
        setLibraryId(response.data.id);
      }
      queryClient.invalidateQueries({ queryKey: ['library'] });
    },
  });
};
