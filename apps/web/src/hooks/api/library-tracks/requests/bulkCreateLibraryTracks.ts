import { apiClient } from '@/lib/api-client';
import {
  BulkCreateLibraryTracksResponseSchema,
  BulkUploadTrackAudioResponseSchema,
  type BulkCreateLibraryTracksRequest,
  type BulkCreateLibraryTracksResponse,
  type BulkUploadTrackAudioResponse,
} from '@repo/contracts';
import type { BulkTrackItem } from '@/lib/types/library';
import type { ZodAlbumInfer } from '@repo/contracts';

export interface BulkCreateLibraryTracksParams {
  album: ZodAlbumInfer;
  tracks: BulkTrackItem[];
}

export const bulkCreateLibraryTracks = async ({
  album,
  tracks,
}: BulkCreateLibraryTracksParams): Promise<{
  createResponse: BulkCreateLibraryTracksResponse;
  uploadResponse: BulkUploadTrackAudioResponse;
}> => {
  const artistIds = album.artists?.map((a) => a.id) ?? [];
  if (artistIds.length === 0) {
    throw new Error('Album must have at least one artist');
  }

  const bulkCreateRequest: BulkCreateLibraryTracksRequest = {
    tracks: tracks.map(({ title, trackNumber, diskNumber, explicit }) => ({
      title,
      trackNumber,
      diskNumber,
      explicit,
      artistIds,
    })),
  };

  const createResponse = await apiClient<BulkCreateLibraryTracksResponse>(
    `library/albums/${album.id}/tracks/bulk`,
    {
      method: 'POST',
      body: bulkCreateRequest,
      zodSchema: BulkCreateLibraryTracksResponseSchema,
    },
  );

  if (!createResponse.success || !createResponse.data?.tracks) {
    throw new Error('Failed to create tracks');
  }

  const createdTracks = createResponse.data.tracks;
  if (createdTracks.length !== tracks.length) {
    throw new Error('Track count mismatch after creation');
  }

  const trackIds = createdTracks.map((t) => t.id);
  const formData = new FormData();
  formData.append('trackIds', JSON.stringify(trackIds));
  tracks.forEach(({ file }) => {
    formData.append('files', file);
  });

  const uploadResponse = await apiClient<BulkUploadTrackAudioResponse>(
    `library/albums/${album.id}/tracks/bulk/audio`,
    {
      method: 'POST',
      body: formData,
      zodSchema: BulkUploadTrackAudioResponseSchema,
    },
  );

  return { createResponse, uploadResponse };
};
