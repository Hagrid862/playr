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
  /** When creating a new album, the API response may not include artists. Pass artistIds explicitly. */
  artistIds?: string[];
}

export const bulkCreateLibraryTracks = async ({
  album,
  tracks,
  artistIds: explicitArtistIds,
}: BulkCreateLibraryTracksParams): Promise<{
  createResponse: BulkCreateLibraryTracksResponse;
  uploadResponse: BulkUploadTrackAudioResponse;
}> => {
  const defaultArtistIds = explicitArtistIds?.length
    ? explicitArtistIds
    : (album.artists?.map((a) => a.id) ?? []);
  if (defaultArtistIds.length === 0) {
    throw new Error('Album must have at least one artist');
  }

  const bulkCreateRequest: BulkCreateLibraryTracksRequest = {
    tracks: tracks.map(
      ({ title, trackNumber, diskNumber, explicit, artistIds: perTrackArtists, genreIds }) => {
        const resolved =
          perTrackArtists && perTrackArtists.length > 0 ? perTrackArtists : defaultArtistIds;
        const item: BulkCreateLibraryTracksRequest['tracks'][number] = {
          title,
          trackNumber,
          diskNumber,
          explicit,
          artistIds: resolved,
        };
        if (genreIds && genreIds.length > 0) {
          item.genreIds = genreIds;
        }
        return item;
      },
    ),
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
