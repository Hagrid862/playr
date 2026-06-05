import { apiClient } from '@/lib/api-client';
import { GetListenHistoryResponseSchema, type GetListenHistoryResponse } from '@repo/contracts';

export const getListenHistory = (
  params: {
    page?: number;
    limit?: number;
  } = {},
) => {
  const { page = 1, limit = 20 } = params;
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  return apiClient<GetListenHistoryResponse>(`history?${queryParams.toString()}`, {
    method: 'GET',
    zodSchema: GetListenHistoryResponseSchema,
  });
};
