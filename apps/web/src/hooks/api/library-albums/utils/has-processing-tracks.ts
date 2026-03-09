import type { GetLibraryAlbumResponse } from '@repo/contracts';

export function hasProcessingTracks(data: GetLibraryAlbumResponse | undefined): boolean {
  const tracks = data?.data?.tracks;
  if (!tracks?.length) return false;
  return tracks.some((track) =>
    track.audioFiles?.some((f) => f.status === 'pending' || f.status === 'processing'),
  );
}
