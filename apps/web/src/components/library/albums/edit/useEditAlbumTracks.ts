import { makeLocalPendingArtistId } from '@/components/library/albums/create/pendingLibraryArtist';
import {
  extractMetadataFromAudioFile,
  type ExtractedAudioMetadata,
} from '@/lib/audio/audio-metadata';
import { cleanFilenameToTitle } from '@/lib/audio/clean-audio-filename';
import type { BulkTrackItem } from '@/lib/types/library';
import type { UpdateLibraryTrackRequest, ZodAlbum, ZodTrack } from '@repo/contracts';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type EditAlbumTrackDraft = {
  title: string;
  trackNumber: number;
  diskNumber: number;
  explicit: boolean;
  artistIds: string[];
};

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

function trackToDraft(track: ZodTrack): EditAlbumTrackDraft {
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

function draftsEqualForTrack(track: ZodTrack, draft: EditAlbumTrackDraft) {
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

function buildDraftsFromServerTracks(tracks: ZodTrack[]): Record<string, EditAlbumTrackDraft> {
  const next: Record<string, EditAlbumTrackDraft> = {};
  for (const t of tracks) {
    next[t.id] = trackToDraft(t);
  }
  return next;
}

export function useEditAlbumTracks(album: ZodAlbum) {
  const serverTracks = useMemo(() => album.tracks ?? [], [album.tracks]);
  const syncKey = useMemo(
    () => serverTracks.map((t) => `${t.id}:${t.updatedAt}`).join('|'),
    [serverTracks],
  );

  const [prevSyncKey, setPrevSyncKey] = useState(syncKey);
  const [draftById, setDraftById] = useState<Record<string, EditAlbumTrackDraft>>(() =>
    buildDraftsFromServerTracks(album.tracks ?? []),
  );
  const [stagedTracks, setStagedTracks] = useState<BulkTrackItem[]>([]);
  const [pendingArtists, setPendingArtists] = useState<PendingArtistDraft[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(() => new Set());
  const [isScanningMetadata, setIsScanningMetadata] = useState(false);

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

  const defaultArtistIds = useMemo(() => album.artists?.map((a) => a.id) ?? [], [album.artists]);

  const trackIds = useMemo(() => stagedTracks.map((t) => t.id).join(','), [stagedTracks]);
  const lastScannedStagedIds = useRef('');
  const stagedTracksRef = useRef(stagedTracks);

  useEffect(() => {
    stagedTracksRef.current = stagedTracks;
  }, [stagedTracks]);

  useEffect(() => {
    if (trackIds === '') return;

    const snapshot = stagedTracksRef.current;
    if (snapshot.length === 0) return;
    if (lastScannedStagedIds.current === trackIds) return;
    lastScannedStagedIds.current = trackIds;

    let cancelled = false;

    const scan = async () => {
      setIsScanningMetadata(true);
      const results: ExtractedAudioMetadata[] = [];

      for (const track of snapshot) {
        if (cancelled) break;
        const meta = await extractMetadataFromAudioFile(track.file);
        results.push(meta ?? {});
      }

      if (!cancelled && results.length === snapshot.length) {
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
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        const d = next[k];
        if (!d) continue;
        next[k] = {
          ...d,
          artistIds: d.artistIds.filter((x) => x !== localId),
        };
      }
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

      const newTracks: BulkTrackItem[] = audioFiles.map((file, i) => ({
        id: `${Date.now()}-${i}-${file.name}`,
        file,
        title: cleanFilenameToTitle(file.name, { artists: [], album: album.name ?? '' }),
        trackNumber: 0,
        diskNumber: 1,
        explicit: false,
        artistIds: seedArtistIds,
      }));

      setStagedTracks((prev) => {
        const albumCount = album.tracks?.length ?? 0;
        const combined = [...prev, ...newTracks].sort((a, b) =>
          a.file.name.localeCompare(b.file.name, undefined, { numeric: true }),
        );
        return combined.map((t, i) => ({
          ...t,
          trackNumber: albumCount + i + 1,
          artistIds: t.artistIds?.length ? t.artistIds : seedArtistIds,
        }));
      });
    },
    [album.name, album.tracks?.length, defaultArtistIds],
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
        const filtered = prev.filter((t) => t.id !== id);
        const albumCount = album.tracks?.length ?? 0;
        return filtered.map((t, i) => ({
          ...t,
          trackNumber: albumCount + i + 1,
        }));
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

    for (const track of serverTracks) {
      if (pendingDeleteIds.has(track.id)) continue;
      const draft = draftById[track.id];
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
          },
        });
      }
    }

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
    for (const track of serverTracks) {
      if (pendingDeleteIds.has(track.id)) continue;
      const draft = draftById[track.id];
      if (draft && !draftsEqualForTrack(track, draft)) return true;
    }
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
