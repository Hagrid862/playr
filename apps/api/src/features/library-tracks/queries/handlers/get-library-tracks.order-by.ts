import type { LibraryTrackListSortBy, LibraryTrackListSortOrder } from '@repo/contracts';
import type { Prisma } from '@repo/db';

const tieBreaker: Prisma.LibraryTrackOrderByWithRelationInput = {
  track: { id: 'asc' },
};

/**
 * Maps API sort params to Prisma `orderBy` for `libraryTrack.findMany`.
 * Does not handle `sortBy: artist` (implicit M2M — use repository raw SQL path).
 * Legacy (no sort): `trackNumber` ascending with stable `track.id` tie-breaker.
 */
export function buildGetLibraryTracksOrderBy(
  sortBy: LibraryTrackListSortBy | undefined,
  sortOrder: LibraryTrackListSortOrder | undefined,
): Prisma.LibraryTrackOrderByWithRelationInput | Prisma.LibraryTrackOrderByWithRelationInput[] {
  if (!sortBy || !sortOrder) {
    return [{ track: { trackNumber: 'asc' } }, tieBreaker];
  }

  if (sortBy === 'artist') {
    throw new Error('buildGetLibraryTracksOrderBy: artist sort is handled separately');
  }

  const dir = sortOrder;
  let primary: Prisma.LibraryTrackOrderByWithRelationInput;

  switch (sortBy) {
    case 'title':
      primary = { track: { title: dir } };
      break;
    case 'duration':
      primary = { track: { duration: dir } };
      break;
    case 'trackNumber':
      primary = { track: { trackNumber: dir } };
      break;
    case 'diskNumber':
      primary = { track: { diskNumber: dir } };
      break;
    case 'album':
      primary = { track: { album: { name: dir } } };
      break;
  }

  return [primary, tieBreaker];
}
