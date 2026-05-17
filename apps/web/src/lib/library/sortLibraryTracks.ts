import { UNKNOWN_ALBUM_LABEL } from '@/lib/display-constants';
import type { ZodTrack } from '@repo/contracts';

/**
 * Compare two tracks for library-wide display order (album → disk → track # → title).
 * Exported for focused unit tests; prefer `sortLibraryTracksForDisplay` in application code.
 */
export function compareLibraryTracksForDisplay(a: ZodTrack, b: ZodTrack): number {
  const nameA = a.album?.name?.trim() || UNKNOWN_ALBUM_LABEL;
  const nameB = b.album?.name?.trim() || UNKNOWN_ALBUM_LABEL;
  const albumCmp = nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
  if (albumCmp !== 0) return albumCmp;

  const diskA = a.diskNumber ?? 1;
  const diskB = b.diskNumber ?? 1;
  if (diskA !== diskB) return diskA - diskB;

  const tnA = a.trackNumber ?? 0;
  const tnB = b.trackNumber ?? 0;
  if (tnA !== tnB) return tnA - tnB;

  const titleA = a.title?.trim() ?? '';
  const titleB = b.title?.trim() ?? '';
  return titleA.localeCompare(titleB, undefined, { sensitivity: 'base' });
}

/**
 * Client-side ordering for library-wide track lists. The API paginates by
 * trackNumber only; this sort stabilizes UX until a server `sort` exists.
 */
export function sortLibraryTracksForDisplay(tracks: ZodTrack[]): ZodTrack[] {
  return [...tracks].sort(compareLibraryTracksForDisplay);
}
