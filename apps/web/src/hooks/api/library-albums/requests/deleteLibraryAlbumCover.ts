import { apiClient } from '@/lib/api-client';
import {
  DeleteLibraryAlbumCoverResponse,
  DeleteLibraryAlbumCoverResponseSchema,
} from '@repo/contracts';

export const deleteLibraryAlbumCover = async (
  id: string,
): Promise<DeleteLibraryAlbumCoverResponse> => {
  return apiClient(`library/albums/${id}/cover`, {
    method: 'DELETE',
    zodSchema: DeleteLibraryAlbumCoverResponseSchema,
  });
};
