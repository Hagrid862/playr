import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clearListenHistory } from './requests/clearListenHistory';

export const useClearListenHistory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clearListenHistory,
    onSuccess: () => {
      // Wipes out cached pages so the UI updates to empty immediately
      queryClient.setQueriesData(
        { queryKey: ['library', 'history', 'infinite'] },
        () => undefined
      );
      // Invalidate queries to fetch the fresh empty state from backend
      queryClient.invalidateQueries({
        queryKey: ['library', 'history', 'infinite'],
      });
    },
  });
};
