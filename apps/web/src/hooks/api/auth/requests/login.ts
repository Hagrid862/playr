import { apiClient } from '@/lib/api-client';
import type { LoginRequest, LoginResponse } from '@repo/contracts';
import { LoginResponseSchema } from '@repo/contracts';

export const login = (data: LoginRequest) => {
  return apiClient<LoginResponse>('auth/login', {
    method: 'POST',
    body: data,
    zodSchema: LoginResponseSchema,
    allowRefresh: false,
  });
};
