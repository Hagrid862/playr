import type { RecoverPasswordRequest, RecoverPasswordResponse } from '@repo/contracts';
import { RecoverPasswordResponseSchema } from '@repo/contracts';
import { apiClient } from '@/lib/api-client.ts';

export const recoverPassword = (data: RecoverPasswordRequest) => {
  return apiClient<RecoverPasswordResponse>('auth/recover-password', {
    method: 'POST',
    body: data,
    zodSchema: RecoverPasswordResponseSchema,
  });
};
