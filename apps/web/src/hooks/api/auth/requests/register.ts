import { apiClient } from '@/lib/api-client';
import type { RegisterRequest, RegisterResponse } from '@repo/contracts';
import { RegisterResponseSchema } from '@repo/contracts';

export const register = (data: RegisterRequest) => {
  return apiClient<RegisterResponse>('auth/register', {
    body: data,
    zodSchema: RegisterResponseSchema,
    allowRefresh: false,
  });
};
