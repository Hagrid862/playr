import type { ZodTrack } from '@repo/contracts';

export type EditAlbumTrackDraft = {
  title: string;
  trackNumber: number;
  diskNumber: number;
  explicit: boolean;
  artistIds: string[];
  genreIds: string[];
};

export function trackToDraft(track: ZodTrack): EditAlbumTrackDraft {
  return {
    title: track.title,
    trackNumber: track.trackNumber,
    diskNumber: track.diskNumber,
    explicit: track.explicit,
    artistIds: track.artists?.map((a) => a.id) ?? [],
    genreIds: track.genres?.map((g) => g.genreId) ?? [],
  };
}

function sortIds(ids: string[]) {
  return [...ids].sort();
}

export function draftsEqualForTrack(track: ZodTrack, draft: EditAlbumTrackDraft) {
  const aArtists = sortIds(track.artists?.map((x) => x.id) ?? []).join('\0');
  const bArtists = sortIds(draft.artistIds).join('\0');

  const aGenres = sortIds(track.genres?.map((x) => x.genreId) ?? []).join('\0');
  const bGenres = sortIds(draft.genreIds).join('\0');

  return (
    track.title === draft.title &&
    track.trackNumber === draft.trackNumber &&
    track.diskNumber === draft.diskNumber &&
    track.explicit === draft.explicit &&
    aArtists === bArtists &&
    aGenres === bGenres
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
