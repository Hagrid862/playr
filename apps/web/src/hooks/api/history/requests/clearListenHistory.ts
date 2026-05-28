import { apiClient } from '@/lib/api-client';

export const clearListenHistory = () => {
  return apiClient<{ success: boolean }>('history', {
    method: 'DELETE',
  });
};
