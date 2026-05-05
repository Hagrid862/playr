import type { ZodTrack } from '@repo/contracts';

export type EditAlbumTrackDraft = {
  title: string;
  trackNumber: number;
  diskNumber: number;
  explicit: boolean;
  artistIds: string[];
};

export function trackToDraft(track: ZodTrack): EditAlbumTrackDraft {
  return {
    title: track.title,
    trackNumber: track.trackNumber,
    diskNumber: track.diskNumber,
    explicit: track.explicit,
    artistIds: track.artists?.map((a) => a.id) ?? [],
  };
}

function sortIds(ids: string[]) {
  return [...ids].sort();
}

export function draftsEqualForTrack(track: ZodTrack, draft: EditAlbumTrackDraft) {
  const a = sortIds(track.artists?.map((x) => x.id) ?? []).join('\0');
  const b = sortIds(draft.artistIds).join('\0');
  return (
    track.title === draft.title &&
    track.trackNumber === draft.trackNumber &&
    track.diskNumber === draft.diskNumber &&
    track.explicit === draft.explicit &&
    a === b
  );
}

export function buildDraftsFromServerTracks(
  tracks: ZodTrack[],
): Record<string, EditAlbumTrackDraft> {
  const next: Record<string, EditAlbumTrackDraft> = {};
  for (const t of tracks) {
    next[t.id] = trackToDraft(t);
  }
  return next;
}
