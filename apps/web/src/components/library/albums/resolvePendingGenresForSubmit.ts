import type { BulkTrackItem } from '@/lib/types/library';
import type { UpdateLibraryAlbumRequest } from '@repo/contracts';
import { isLocalPendingGenreId } from './create/pendingLibraryGenre';
import type { EditAlbumTracksSubmitPayload } from './edit/useEditAlbumTracks';

type CreateLibraryGenreFn = (input: { name: string }) => Promise<{ data?: { id: string } }>;

export function collectPendingGenreIdsFromBulkTracks(tracks: BulkTrackItem[]): Set<string> {
  const ids = new Set<string>();
  for (const t of tracks) {
    for (const g of t.genreIds ?? []) {
      if (isLocalPendingGenreId(g)) ids.add(g);
    }
  }
  return ids;
}

export function collectPendingGenreIdsForAlbumSubmit(
  albumGenreIds: string[] | undefined,
  tracks: EditAlbumTracksSubmitPayload,
): Set<string> {
  const ids = new Set<string>();
  const add = (list?: string[]) => {
    for (const g of list ?? []) {
      if (isLocalPendingGenreId(g)) ids.add(g);
    }
  };
  add(albumGenreIds);
  for (const u of tracks.existingUpdates) {
    add(u.data.genreIds);
  }
  for (const t of tracks.newTracks) {
    add(t.genreIds);
  }
  return ids;
}

export async function buildPendingGenreLocalToServerMap(
  pendingIdsNeeded: Set<string>,
  pendingGenres: { id: string; name: string }[],
  createLibraryGenre: CreateLibraryGenreFn,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const localId of pendingIdsNeeded) {
    const pending = pendingGenres.find((p) => p.id === localId);
    if (!pending?.name.trim()) {
      throw new Error('Genre name is missing');
    }
    const created = await createLibraryGenre({ name: pending.name.trim() });
    if (!created.data?.id) {
      throw new Error('Failed to create genre');
    }
    map.set(localId, created.data.id);
  }
  return map;
}

function mapGenreIdArray(ids: string[] | undefined, m: Map<string, string>): string[] | undefined {
  if (ids === undefined) return undefined;
  return ids.map((id) => m.get(id) ?? id);
}

export function applyPendingGenreMapToBulkTracks(
  tracks: BulkTrackItem[],
  m: Map<string, string>,
): BulkTrackItem[] {
  return tracks.map((t) => ({
    ...t,
    genreIds: mapGenreIdArray(t.genreIds, m),
  }));
}

export function applyPendingGenreMapToEditPayload(
  values: UpdateLibraryAlbumRequest,
  tracks: EditAlbumTracksSubmitPayload,
  m: Map<string, string>,
): { values: UpdateLibraryAlbumRequest; tracks: EditAlbumTracksSubmitPayload } {
  return {
    values: {
      ...values,
      genreIds: mapGenreIdArray(values.genreIds, m),
    },
    tracks: {
      ...tracks,
      existingUpdates: tracks.existingUpdates.map((u) => ({
        ...u,
        data: {
          ...u.data,
          genreIds: mapGenreIdArray(u.data.genreIds, m),
        },
      })),
      newTracks: applyPendingGenreMapToBulkTracks(tracks.newTracks, m),
    },
  };
}
