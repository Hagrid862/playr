import { apiClient } from '@/lib/api-client';
import type { CreatePrivateProfileResponseDto } from '@repo/contracts';
import { CreatePrivateProfileResponseSchema } from '@repo/contracts';

export const createPrivateProfile = () => {
  return apiClient<CreatePrivateProfileResponseDto>('private-profile', {
    method: 'POST',
    zodSchema: CreatePrivateProfileResponseSchema,
  });
};
