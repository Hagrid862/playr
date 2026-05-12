import type { BulkTrackItem } from '@/lib/types/library';
import type { UpdateLibraryAlbumRequest } from '@repo/contracts';
import { isLocalPendingArtistId } from './create/pendingLibraryArtist';
import type { EditAlbumTracksSubmitPayload } from './edit/useEditAlbumTracks';

type CreateLibraryArtistFn = (input: { name: string }) => Promise<{ data?: { id: string } }>;

export function collectPendingArtistIdsFromBulkTracks(tracks: BulkTrackItem[]): Set<string> {
  const ids = new Set<string>();
  for (const t of tracks) {
    for (const a of t.artistIds ?? []) {
      if (isLocalPendingArtistId(a)) ids.add(a);
    }
  }
  return ids;
}

export function collectPendingArtistIdsForAlbumSubmit(
  albumArtistIds: string[] | undefined,
  tracks: EditAlbumTracksSubmitPayload,
): Set<string> {
  const ids = new Set<string>();
  const add = (list?: string[]) => {
    for (const a of list ?? []) {
      if (isLocalPendingArtistId(a)) ids.add(a);
    }
  };
  add(albumArtistIds);
  for (const u of tracks.existingUpdates) {
    add(u.data.artistIds);
  }
  for (const t of tracks.newTracks) {
    add(t.artistIds);
  }
  for (const { localId } of tracks.pendingArtistsToCreate) {
    if (isLocalPendingArtistId(localId)) ids.add(localId);
  }
  return ids;
}

export async function buildPendingArtistLocalToServerMap(
  pendingIdsNeeded: Set<string>,
  pendingArtists: { id: string; name: string }[],
  createLibraryArtist: CreateLibraryArtistFn,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const localId of pendingIdsNeeded) {
    const pending = pendingArtists.find((p) => p.id === localId);
    if (!pending?.name.trim()) {
      throw new Error('Artist name is missing');
    }
    const created = await createLibraryArtist({ name: pending.name.trim() });
    if (!created.data?.id) {
      throw new Error('Failed to create artist');
    }
    map.set(localId, created.data.id);
  }
  return map;
}

function mapArtistIdArray(ids: string[] | undefined, m: Map<string, string>): string[] | undefined {
  if (ids === undefined) return undefined;
  return ids.map((id) => m.get(id) ?? id);
}

export function applyPendingArtistMapToBulkTracks(
  tracks: BulkTrackItem[],
  m: Map<string, string>,
): BulkTrackItem[] {
  return tracks.map((t) => ({
    ...t,
    artistIds: mapArtistIdArray(t.artistIds, m),
  }));
}

export function applyPendingArtistMapToEditPayload(
  values: UpdateLibraryAlbumRequest,
  tracks: EditAlbumTracksSubmitPayload,
  m: Map<string, string>,
): { values: UpdateLibraryAlbumRequest; tracks: EditAlbumTracksSubmitPayload } {
  return {
    values: {
      ...values,
      artistIds: mapArtistIdArray(values.artistIds, m),
    },
    tracks: {
      pendingArtistsToCreate: [],
      existingUpdates: tracks.existingUpdates.map((u) => ({
        ...u,
        data: {
          ...u.data,
          artistIds: mapArtistIdArray(u.data.artistIds, m),
        },
      })),
      deleteIds: tracks.deleteIds,
      newTracks: applyPendingArtistMapToBulkTracks(tracks.newTracks, m),
    },
  };
}

export function mergePendingArtistDrafts(
  album: { id: string; name: string }[],
  tracks: { id: string; name: string }[],
): { id: string; name: string }[] {
  const byId = new Map<string, { id: string; name: string }>();
  for (const p of [...album, ...tracks]) {
    if (!byId.has(p.id)) byId.set(p.id, p);
  }
  return [...byId.values()];
}
