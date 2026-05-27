import { LogoutResponse } from '@repo/contracts';
import { apiClient } from '@/lib/api-client';
import { LogoutRequest } from '@repo/contracts';

export const logout = (data: LogoutRequest) => {
  return apiClient<LogoutResponse>('auth/logout', {
    method: 'POST',
    body: data,
    allowRefresh: false,
  });
};
