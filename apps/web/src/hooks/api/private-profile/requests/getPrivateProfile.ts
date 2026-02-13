import { apiClient } from '@/lib/api-client';
import type { GetPrivateProfileResponseDto } from '@repo/contracts';
import { GetPrivateProfileResponseSchema } from '@repo/contracts';

export const getPrivateProfile = () => {
  return apiClient<GetPrivateProfileResponseDto>('private-profile', {
    method: 'GET',
    zodSchema: GetPrivateProfileResponseSchema,
  });
};
