import {
  extractCoverFromAudioFile,
  extractMetadataFromAudioFile,
  type ExtractedAudioMetadata,
} from '@/lib/audio/audio-metadata';
import { cleanFilenameToTitle } from '@/lib/audio/clean-audio-filename';
import { sha256HexFromBlob } from '@/lib/crypto/sha256HexFromBlob';
import type { BulkTrackItem, CoverArtGroup, TrackWithCover } from '@/lib/types/library';
import type { CreateLibraryAlbumRequest } from '@repo/contracts';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type LibraryAlbumFromFilesFormData = Pick<
  CreateLibraryAlbumRequest,
  'name' | 'description' | 'type' | 'releaseDate'
> & {
  artistId: string;
};

const initialFormData: LibraryAlbumFromFilesFormData = {
  name: '',
  description: '',
  type: 'album',
  artistId: '',
  releaseDate: null,
};

export type LibraryAlbumFromFilesUploadStep =
  | 'idle'
  | 'creating-album'
  | 'uploading-cover'
  | 'uploading-tracks';

export type UseLibraryAlbumFromFilesFormOptions = {
  initialArtistId?: string;
};

export function useLibraryAlbumFromFilesForm(options?: UseLibraryAlbumFromFilesFormOptions) {
  const [formData, setFormData] = useState<LibraryAlbumFromFilesFormData>(() => ({
    ...initialFormData,
    artistId: options?.initialArtistId ?? '',
  }));
  const [tracks, setTracks] = useState<BulkTrackItem[]>([]);
  const [tracksWithCovers, setTracksWithCovers] = useState<TrackWithCover[]>([]);
  const [coverGroups, setCoverGroups] = useState<CoverArtGroup[]>([]);
  const [selectedCoverTrackId, setSelectedCoverTrackId] = useState<string | null>(null);
  const [isScanningMetadata, setIsScanningMetadata] = useState(false);
  const [isScanningCovers, setIsScanningCovers] = useState(false);
  const [manualAlbumCoverFile, setManualAlbumCoverFile] = useState<File | null>(null);
  const [manualAlbumCoverPreviewUrl, setManualAlbumCoverPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const manualAlbumCoverFileRef = useRef<File | null>(null);
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;
  manualAlbumCoverFileRef.current = manualAlbumCoverFile;

  const trackIds = useMemo(() => tracks.map((t) => t.id).join(','), [tracks]);
  const lastScannedTrackIds = useRef<string>('');

  // Scan metadata from all files when tracks change (only when track set actually changed)
  useEffect(() => {
    if (tracks.length === 0) return;
    if (lastScannedTrackIds.current === trackIds) return;
    lastScannedTrackIds.current = trackIds;

    let cancelled = false;

    const scan = async () => {
      setIsScanningMetadata(true);
      const results: ExtractedAudioMetadata[] = [];

      for (const track of tracks) {
        if (cancelled) break;
        const meta = await extractMetadataFromAudioFile(track.file);
        results.push(meta ?? {});
      }

      if (!cancelled && results.length === tracks.length) {
        const albums = results.map((r) => r.album).filter(Boolean);
        const albumName =
          albums.length > 0
            ? (albums.sort(
                (a, b) =>
                  albums.filter((x) => x === b).length - albums.filter((x) => x === a).length,
              )[0] as string)
            : '';

        const year = results.find((r) => r.year)?.year;

        setFormData((prev) => ({
          ...prev,
          name: prev.name || albumName,
          releaseDate: prev.releaseDate ?? (year ? new Date(year, 0, 1) : null),
        }));

        setTracks((prev) =>
          prev.map((t, i) => {
            const meta = results[i];
            const context = {
              artists: meta?.artist ? [meta.artist] : [],
              album: meta?.album ?? '',
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
  }, [trackIds, tracks]);

  // Scan covers when track IDs change only (not when metadata updates titles)
  useEffect(() => {
    if (trackIds === '') {
      return;
    }

    const snapshot = tracksRef.current;
    if (snapshot.length === 0) return;

    let cancelled = false;

    const scan = async () => {
      setIsScanningCovers(true);
      const results: TrackWithCover[] = [];

      try {
        for (const track of snapshot) {
          if (cancelled) break;
          const coverFile = await extractCoverFromAudioFile(track.file);
          if (coverFile && !cancelled) {
            const previewUrl = URL.createObjectURL(coverFile);
            results.push({
              trackId: track.id,
              trackName: track.file.name,
              coverFile,
              previewUrl,
            });
          }
        }

        if (cancelled) {
          results.forEach((r) => URL.revokeObjectURL(r.previewUrl));
          return;
        }

        const digestMap = new Map<string, CoverArtGroup>();
        for (const twc of results) {
          const digest = await sha256HexFromBlob(twc.coverFile);
          if (cancelled) return;
          const existing = digestMap.get(digest);
          if (!existing) {
            digestMap.set(digest, {
              digest,
              representativeTrackId: twc.trackId,
              trackIds: [twc.trackId],
              previewUrl: twc.previewUrl,
              trackFileNames: [twc.trackName],
            });
          } else {
            existing.trackIds.push(twc.trackId);
            existing.trackFileNames.push(twc.trackName);
          }
        }

        if (cancelled) return;

        const groups = [...digestMap.values()];

        setTracksWithCovers(results);
        setCoverGroups(groups);
        setSelectedCoverTrackId((prev) => {
          const idsWithCover = results.map((r) => r.trackId);
          if (prev != null && idsWithCover.includes(prev)) {
            return prev;
          }
          if (manualAlbumCoverFileRef.current != null) {
            return null;
          }
          return groups[0]?.representativeTrackId ?? null;
        });
      } finally {
        if (!cancelled) {
          setIsScanningCovers(false);
        }
      }
    };

    scan();
    return () => {
      cancelled = true;
      setIsScanningCovers(false);
    };
  }, [trackIds]);

  useEffect(() => {
    return () => {
      tracksWithCovers.forEach((t) => URL.revokeObjectURL(t.previewUrl));
    };
  }, [tracksWithCovers]);

  useEffect(() => {
    return () => {
      if (manualAlbumCoverPreviewUrl) {
        URL.revokeObjectURL(manualAlbumCoverPreviewUrl);
      }
    };
  }, [manualAlbumCoverPreviewUrl]);

  const setManualAlbumCover = useCallback((file: File | null) => {
    setManualAlbumCoverPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
    setManualAlbumCoverFile(file);
    if (file != null) {
      setSelectedCoverTrackId(null);
    }
  }, []);

  const removeManualAlbumCover = useCallback(() => {
    setManualAlbumCoverPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setManualAlbumCoverFile(null);
  }, []);

  const addFiles = useCallback((files: FileList | null) => {
    if (!files?.length) return;

    const audioFiles = Array.from(files).filter((f) => f.type.startsWith('audio/'));
    if (audioFiles.length === 0) return;

    const newTracks: BulkTrackItem[] = audioFiles.map((file, i) => ({
      id: `${Date.now()}-${i}-${file.name}`,
      file,
      title: cleanFilenameToTitle(file.name, { artists: [], album: '' }),
      trackNumber: 0,
      diskNumber: 1,
      explicit: false,
    }));

    setTracks((prev) => {
      const combined = [...prev, ...newTracks].sort((a, b) =>
        a.file.name.localeCompare(b.file.name, undefined, { numeric: true }),
      );
      return combined.map((t, i) => ({ ...t, trackNumber: i + 1 }));
    });
  }, []);

  const updateTrack = useCallback(
    (id: string, updates: Partial<Omit<BulkTrackItem, 'id' | 'file'>>) => {
      setTracks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    },
    [],
  );

  const removeTrack = useCallback(
    (id: string) => {
      const willBeEmpty = tracks.filter((t) => t.id !== id).length === 0;
      if (willBeEmpty) {
        setTracksWithCovers([]);
        setCoverGroups([]);
        setSelectedCoverTrackId(null);
      }
      setTracks((prev) => {
        const filtered = prev.filter((t) => t.id !== id);
        return filtered.map((t, i) => ({
          ...t,
          trackNumber: i + 1,
        }));
      });
    },
    [tracks],
  );

  const clearTracks = useCallback(() => {
    lastScannedTrackIds.current = '';
    setTracksWithCovers([]);
    setCoverGroups([]);
    setSelectedCoverTrackId(null);
    setTracks([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const clearAll = useCallback(() => {
    clearTracks();
    setFormData({
      ...initialFormData,
      artistId: options?.initialArtistId ?? '',
    });
    setManualAlbumCover(null);
  }, [clearTracks, options?.initialArtistId, setManualAlbumCover]);

  const updateFormData = useCallback(
    <K extends keyof LibraryAlbumFromFilesFormData>(
      field: K,
      value: LibraryAlbumFromFilesFormData[K],
    ) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const selectedCoverFile = useMemo(
    () =>
      selectedCoverTrackId != null
        ? (tracksWithCovers.find((t) => t.trackId === selectedCoverTrackId)?.coverFile ?? null)
        : null,
    [selectedCoverTrackId, tracksWithCovers],
  );

  const coverFileForUpload = useMemo(
    () => manualAlbumCoverFile ?? selectedCoverFile,
    [manualAlbumCoverFile, selectedCoverFile],
  );

  const hasInvalidTracks = tracks.some(
    (t) => !t.title.trim() || t.trackNumber < 1 || t.diskNumber < 1,
  );

  const isFormValid =
    formData.name.trim().length > 0 &&
    formData.artistId.length > 0 &&
    !hasInvalidTracks &&
    tracks.length > 0;

  return {
    formData,
    tracks,
    tracksWithCovers,
    coverGroups,
    selectedCoverTrackId,
    setSelectedCoverTrackId,
    selectedCoverFile,
    manualAlbumCoverPreviewUrl,
    setManualAlbumCover,
    removeManualAlbumCover,
    coverFileForUpload,
    isScanningMetadata,
    isScanningCovers,
    fileInputRef,
    addFiles,
    updateTrack,
    removeTrack,
    clearTracks,
    clearAll,
    updateFormData,
    isFormValid,
  };
}
