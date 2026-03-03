import {
  extractCoverFromAudioFile,
  extractMetadataFromAudioFile,
  type ExtractedAudioMetadata,
} from '@/lib/audio-metadata';
import { cleanFilenameToTitle } from '@/lib/clean-audio-filename';
import type { BulkTrackItem, TrackWithCover } from '@/lib/types/library';
import type { CreateLibraryAlbumRequest } from '@repo/contracts';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type BulkAlbumFormData = Pick<
  CreateLibraryAlbumRequest,
  'name' | 'description' | 'type' | 'releaseDate'
> & {
  artistId: string;
};

const initialFormData: BulkAlbumFormData = {
  name: '',
  description: '',
  type: 'album',
  artistId: '',
  releaseDate: null,
};

export type BulkAlbumUploadStep = 'idle' | 'creating-album' | 'uploading-cover' | 'uploading-tracks';

export function useBulkAlbumUploadForm() {
  const [formData, setFormData] = useState<BulkAlbumFormData>(initialFormData);
  const [tracks, setTracks] = useState<BulkTrackItem[]>([]);
  const [tracksWithCovers, setTracksWithCovers] = useState<TrackWithCover[]>([]);
  const [selectedCoverTrackId, setSelectedCoverTrackId] = useState<string | null>(null);
  const [isScanningMetadata, setIsScanningMetadata] = useState(false);
  const [isScanningCovers, setIsScanningCovers] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        // Derive album name: use most common or first non-empty
        const albums = results.map((r) => r.album).filter(Boolean);
        const albumName =
          albums.length > 0
            ? (albums.sort(
                (a, b) =>
                  albums.filter((x) => x === b).length - albums.filter((x) => x === a).length,
              )[0] as string)
            : '';

        // Derive year from first file that has it
        const year = results.find((r) => r.year)?.year;

        setFormData((prev) => ({
          ...prev,
          name: prev.name || albumName,
          releaseDate:
            prev.releaseDate ?? (year ? new Date(year, 0, 1) : null),
        }));

        // Update track titles and numbers from metadata
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

  // Scan covers when tracks change
  useEffect(() => {
    if (tracks.length === 0) return;

    let cancelled = false;

    const scan = async () => {
      setIsScanningCovers(true);
      const results: TrackWithCover[] = [];

      for (const track of tracks) {
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

      if (!cancelled) {
        setTracksWithCovers(results);
        setSelectedCoverTrackId((prev) =>
          results.some((r) => r.trackId === prev) ? prev : (results[0]?.trackId ?? null),
        );
      }

      setIsScanningCovers(false);
    };

    scan();
    return () => {
      cancelled = true;
    };
  }, [trackIds, tracks]);

  useEffect(() => {
    return () => {
      tracksWithCovers.forEach((t) => URL.revokeObjectURL(t.previewUrl));
    };
  }, [tracksWithCovers]);

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

  const clearAll = useCallback(() => {
    lastScannedTrackIds.current = '';
    setTracksWithCovers([]);
    setSelectedCoverTrackId(null);
    setTracks([]);
    setFormData(initialFormData);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const updateFormData = useCallback(<K extends keyof BulkAlbumFormData>(
    field: K,
    value: BulkAlbumFormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const selectedCoverFile = useMemo(
    () =>
      selectedCoverTrackId != null
        ? tracksWithCovers.find((t) => t.trackId === selectedCoverTrackId)?.coverFile ?? null
        : null,
    [selectedCoverTrackId, tracksWithCovers],
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
    selectedCoverTrackId,
    setSelectedCoverTrackId,
    selectedCoverFile,
    isScanningMetadata,
    isScanningCovers,
    fileInputRef,
    addFiles,
    updateTrack,
    removeTrack,
    clearAll,
    updateFormData,
    isFormValid,
  };
}
