import { apiClient } from '@/lib/api-client';
import type { RegisterRequest, RegisterResponse } from '@repo/contracts';
import { useMutation } from '@tanstack/react-query';

export function useRegister() {
  return useMutation({
    mutationFn: (data: RegisterRequest) =>
      apiClient<RegisterResponse>('auth/register', { body: data }),
  });
}
