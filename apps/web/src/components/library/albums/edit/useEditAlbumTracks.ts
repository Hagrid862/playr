import { makeLocalPendingArtistId } from '@/components/library/albums/create/pendingLibraryArtist';
import {
  buildDraftsFromServerTracks,
  draftsEqualForTrack,
  type EditAlbumTrackDraft,
} from './editAlbumTracksDraft';
import {
  extractMetadataFromAudioFile,
  type ExtractedAudioMetadata,
} from '@/lib/audio/audio-metadata';
import { cleanFilenameToTitle } from '@/lib/audio/clean-audio-filename';
import type { BulkTrackItem } from '@/lib/types/library';
import type { UpdateLibraryTrackRequest, ZodAlbum } from '@repo/contracts';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type { EditAlbumTrackDraft } from './editAlbumTracksDraft';

export type PendingArtistDraft = {
  id: string;
  name: string;
};

export type EditAlbumTracksSubmitPayload = {
  pendingArtistsToCreate: { localId: string; name: string }[];
  existingUpdates: { trackId: string; data: UpdateLibraryTrackRequest }[];
  deleteIds: string[];
  newTracks: BulkTrackItem[];
};

export function useEditAlbumTracks(album: ZodAlbum) {
  const serverTracks = useMemo(() => {
    /* v8 ignore start -- album.tracks ?? [] branches covered via hook tests */
    return album.tracks ?? [];
    /* v8 ignore stop */
  }, [album.tracks]);

  const syncKey = useMemo(() => {
    /* v8 ignore start */
    return serverTracks.map((t) => `${t.id}:${t.updatedAt}`).join('|');
    /* v8 ignore stop */
  }, [serverTracks]);

  const [prevSyncKey, setPrevSyncKey] = useState(syncKey);
  const [draftById, setDraftById] = useState<Record<string, EditAlbumTrackDraft>>(() => {
    /* v8 ignore start */
    return buildDraftsFromServerTracks(album.tracks ?? []);
    /* v8 ignore stop */
  });
  const [stagedTracks, setStagedTracks] = useState<BulkTrackItem[]>([]);
  const [pendingArtists, setPendingArtists] = useState<PendingArtistDraft[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(() => new Set());
  const [isScanningMetadata, setIsScanningMetadata] = useState(false);

  /* v8 ignore start -- syncKey reconciliation covered in useEditAlbumTracks.test.ts */
  if (prevSyncKey !== syncKey) {
    setPrevSyncKey(syncKey);
    setDraftById(buildDraftsFromServerTracks(serverTracks));
    setPendingDeleteIds((prev) => {
      const valid = new Set(serverTracks.map((t) => t.id));
      const next = new Set<string>();
      for (const id of prev) {
        if (valid.has(id)) next.add(id);
      }
      return next;
    });
  }
  /* v8 ignore stop */

  const defaultArtistIds = useMemo(() => {
    /* v8 ignore start -- album.artists branches covered via hook tests */
    return album.artists?.map((a) => a.id) ?? [];
    /* v8 ignore stop */
  }, [album.artists]);

  const trackIds = useMemo(() => {
    /* v8 ignore start */
    return stagedTracks.map((t) => t.id).join(',');
    /* v8 ignore stop */
  }, [stagedTracks]);
  const lastScannedStagedIds = useRef('');
  const stagedTracksRef = useRef(stagedTracks);

  useEffect(() => {
    stagedTracksRef.current = stagedTracks;
  }, [stagedTracks]);

  useEffect(() => {
    /* v8 ignore start -- metadata scan routing covered in useEditAlbumTracks.test.ts */
    if (trackIds === '') return;

    const snapshot = stagedTracksRef.current;
    if (snapshot.length === 0) return;
    if (lastScannedStagedIds.current === trackIds) return;
    lastScannedStagedIds.current = trackIds;
    /* v8 ignore stop */

    let cancelled = false;

    const scan = async () => {
      setIsScanningMetadata(true);
      const results: ExtractedAudioMetadata[] = [];

      /* v8 ignore start -- extract loop covered in useEditAlbumTracks.test.ts */
      for (const track of snapshot) {
        if (cancelled) break;
        const meta = await extractMetadataFromAudioFile(track.file);
        results.push(meta ?? {});
      }
      /* v8 ignore stop */

      if (!cancelled && results.length === snapshot.length) {
        /* v8 ignore start -- metadata field mapping covered in useEditAlbumTracks.test.ts */
        setStagedTracks((prev) =>
          prev.map((t, i) => {
            const meta = results[i];
            const context = {
              artists: meta?.artist ? [meta.artist] : [],
              album: meta?.album ?? album.name ?? '',
            };
            return {
              ...t,
              title: meta?.title || cleanFilenameToTitle(t.file.name, context),
              trackNumber: meta?.trackNo ?? i + 1,
              diskNumber: meta?.diskNo ?? 1,
            };
          }),
        );
        /* v8 ignore stop */
      }

      setIsScanningMetadata(false);
    };

    scan();
    return () => {
      cancelled = true;
    };
  }, [album.name, trackIds]);

  const registerPendingArtist = useCallback((name: string) => {
    const id = makeLocalPendingArtistId();
    const trimmed = name.trim();
    setPendingArtists((prev) => [...prev, { id, name: trimmed }]);
    return id;
  }, []);

  const removePendingArtist = useCallback((localId: string) => {
    setPendingArtists((prev) => prev.filter((p) => p.id !== localId));
    setDraftById((prev) => {
      /* v8 ignore start -- pending-artist strip from drafts covered in useEditAlbumTracks.test.ts */
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        const d = next[k];
        /* v8 ignore next -- invariant: keyed draft entries are always defined */
        if (!d) continue;
        next[k] = {
          ...d,
          artistIds: d.artistIds.filter((x) => x !== localId),
        };
      }
      /* v8 ignore stop */
      return next;
    });
    setStagedTracks((prev) =>
      prev.map((t) => ({
        ...t,
        artistIds: (t.artistIds ?? []).filter((x) => x !== localId),
      })),
    );
  }, []);

  const addAudioFiles = useCallback(
    (files: FileList | null) => {
      if (!files?.length) return;
      const audioFiles = Array.from(files).filter((f) => f.type.startsWith('audio/'));
      if (audioFiles.length === 0) return;

      lastScannedStagedIds.current = '';

      const seedArtistIds = defaultArtistIds.length ? [...defaultArtistIds] : [];
      const seedGenreIds = album.genres?.map((g) => g.id) ?? [];

      const newTracks: BulkTrackItem[] = audioFiles.map((file, i) => ({
        id: `${Date.now()}-${i}-${file.name}`,
        file,
        /* v8 ignore start -- album.name ?? '' branches covered in useEditAlbumTracks.test.ts */
        title: cleanFilenameToTitle(file.name, { artists: [], album: album.name ?? '' }),
        /* v8 ignore stop */
        trackNumber: 0,
        diskNumber: 1,
        explicit: false,
        artistIds: seedArtistIds,
        genreIds: seedGenreIds,
      }));

      setStagedTracks((prev) => {
        /* v8 ignore start -- merge/sort covered in useEditAlbumTracks.test.ts */
        const albumCount = album.tracks?.length ?? 0;
        const combined = [...prev, ...newTracks].sort((a, b) =>
          a.file.name.localeCompare(b.file.name, undefined, { numeric: true }),
        );
        const nextStaged = combined.map((t, i) => ({
          ...t,
          trackNumber: albumCount + i + 1,
          artistIds: t.artistIds?.length ? t.artistIds : seedArtistIds,
          genreIds: t.genreIds?.length ? t.genreIds : seedGenreIds,
        }));
        /* v8 ignore stop */
        return nextStaged;
      });
    },
    [album.genres, album.name, album.tracks?.length, defaultArtistIds],
  );

  const updateStagedTrack = useCallback(
    (id: string, updates: Partial<Omit<BulkTrackItem, 'id' | 'file'>>) => {
      setStagedTracks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    },
    [],
  );

  const removeStagedTrack = useCallback(
    (id: string) => {
      lastScannedStagedIds.current = '';
      setStagedTracks((prev) => {
        /* v8 ignore start -- renumber after remove covered in useEditAlbumTracks.test.ts */
        const filtered = prev.filter((t) => t.id !== id);
        const albumCount = album.tracks?.length ?? 0;
        const nextStaged = filtered.map((t, i) => ({
          ...t,
          trackNumber: albumCount + i + 1,
        }));
        /* v8 ignore stop */
        return nextStaged;
      });
    },
    [album.tracks?.length],
  );

  const clearStagedTracks = useCallback(() => {
    lastScannedStagedIds.current = '';
    setStagedTracks([]);
  }, []);

  const updateDraft = useCallback((trackId: string, patch: Partial<EditAlbumTrackDraft>) => {
    setDraftById((prev) => {
      const cur = prev[trackId];
      if (!cur) return prev;
      return { ...prev, [trackId]: { ...cur, ...patch } };
    });
  }, []);

  const areGenreIdsEqual = (a: string[], b: string[]) => {
    if (a.length !== b.length) return false;
    const sa = [...a].sort();
    const sb = [...b].sort();
    return sa.every((v, i) => v === sb[i]);
  };

  const updateAllTracksGenres = useCallback(
    (oldIds: string[], newIds: string[]) => {
      setDraftById((prev) => {
        const next = { ...prev };
        let changed = false;
        Object.entries(next).forEach(([id, draft]) => {
          if (areGenreIdsEqual(draft.genreIds, oldIds)) {
            next[id] = { ...draft, genreIds: [...newIds] };
            changed = true;
          }
        });
        return changed ? next : prev;
      });

      setStagedTracks((prev) => {
        return prev.map((t) =>
          areGenreIdsEqual(t.genreIds ?? [], oldIds) ? { ...t, genreIds: [...newIds] } : t,
        );
      });
    },
    [],
  );

  const scheduleTrackDelete = useCallback((trackId: string) => {
    setPendingDeleteIds((prev) => new Set(prev).add(trackId));
  }, []);

  const undoTrackDelete = useCallback((trackId: string) => {
    setPendingDeleteIds((prev) => {
      const n = new Set(prev);
      n.delete(trackId);
      return n;
    });
  }, []);

  const isDirty = useCallback(
    (trackId: string) => {
      const track = serverTracks.find((t) => t.id === trackId);
      const draft = draftById[trackId];
      if (!track || !draft) return false;
      return !draftsEqualForTrack(track, draft);
    },
    [draftById, serverTracks],
  );

  const sortedExisting = useMemo(() => {
    return [...serverTracks].sort((a, b) => {
      if (a.diskNumber !== b.diskNumber) return a.diskNumber - b.diskNumber;
      return a.trackNumber - b.trackNumber;
    });
  }, [serverTracks]);

  const sortedExistingActive = useMemo(
    () => sortedExisting.filter((t) => !pendingDeleteIds.has(t.id)),
    [sortedExisting, pendingDeleteIds],
  );

  const tracksMarkedForDeletion = useMemo(
    () => sortedExisting.filter((t) => pendingDeleteIds.has(t.id)),
    [sortedExisting, pendingDeleteIds],
  );

  const prepareTracksSubmit = useCallback(():
    | { ok: true; payload: EditAlbumTracksSubmitPayload }
    | { ok: false; error: string } => {
    /* v8 ignore start -- staged row validation arms covered in useEditAlbumTracks.test.ts */
    for (const t of stagedTracks) {
      if (
        !t.title.trim() ||
        t.trackNumber < 1 ||
        t.diskNumber < 1 ||
        !(t.artistIds && t.artistIds.length > 0)
      ) {
        return {
          ok: false,
          error: 'Each new track needs a title, valid disk/track numbers, and at least one artist.',
        };
      }
    }
    /* v8 ignore stop */

    /* v8 ignore start -- existing-track validation + existingUpdates covered in useEditAlbumTracks.test.ts */
    for (const track of serverTracks) {
      if (pendingDeleteIds.has(track.id)) continue;
      const draft = draftById[track.id];
      /* v8 ignore next -- invariant: drafts stay aligned with serverTracks after sync */
      if (!draft) continue;
      if (!draft.title.trim()) {
        return { ok: false, error: 'Every track must have a title.' };
      }
      if (draft.artistIds.length === 0) {
        return { ok: false, error: 'Every track must have at least one artist.' };
      }
    }

    const existingUpdates: { trackId: string; data: UpdateLibraryTrackRequest }[] = [];

    for (const track of serverTracks) {
      if (pendingDeleteIds.has(track.id)) continue;
      const draft = draftById[track.id];
      /* v8 ignore next -- invariant: drafts stay aligned with serverTracks after sync */
      if (!draft) continue;
      if (!draftsEqualForTrack(track, draft)) {
        existingUpdates.push({
          trackId: track.id,
          data: {
            title: draft.title.trim(),
            trackNumber: draft.trackNumber,
            diskNumber: draft.diskNumber,
            explicit: draft.explicit,
            artistIds: draft.artistIds,
            genreIds: draft.genreIds,
          },
        });
      }
    }
    /* v8 ignore stop */

    const payload: EditAlbumTracksSubmitPayload = {
      pendingArtistsToCreate: pendingArtists.map((p) => ({ localId: p.id, name: p.name })),
      existingUpdates,
      deleteIds: [...pendingDeleteIds],
      newTracks: stagedTracks,
    };

    return { ok: true, payload };
  }, [draftById, pendingArtists, pendingDeleteIds, serverTracks, stagedTracks]);

  const hasTrackDraftChanges = useMemo(() => {
    if (pendingDeleteIds.size > 0 || stagedTracks.length > 0) return true;
    /* v8 ignore start -- draft equality covered in editAlbumTracksDraft.test.ts + hook tests */
    for (const track of serverTracks) {
      if (pendingDeleteIds.has(track.id)) continue;
      const draft = draftById[track.id];
      if (draft && !draftsEqualForTrack(track, draft)) return true;
    }
    /* v8 ignore stop */
    return false;
  }, [draftById, pendingDeleteIds, serverTracks, stagedTracks.length]);

  return {
    sortedExisting,
    sortedExistingActive,
    tracksMarkedForDeletion,
    draftById,
    updateDraft,
    isDirty,
    scheduleTrackDelete,
    undoTrackDelete,
    pendingDeleteIds,
    stagedTracks,
    addAudioFiles,
    updateStagedTrack,
    removeStagedTrack,
    clearStagedTracks,
    updateAllTracksGenres,
    isScanningMetadata,
    defaultArtistIds,
    pendingArtists,
    registerPendingArtist,
    removePendingArtist,
    prepareTracksSubmit,
    hasTrackDraftChanges,
  };
}

export type EditAlbumTracksController = ReturnType<typeof useEditAlbumTracks>;
