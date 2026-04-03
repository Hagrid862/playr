import { extractCoverFromAudioFile } from '@/lib/audio/audio-metadata';
import { cleanFilenameToTitle } from '@/lib/audio/clean-audio-filename';
import type { BulkTrackItem, TrackWithCover } from '@/lib/types/library';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BulkTrackUploadFormProps } from './BulkTrackUploadForm.types';

export function useBulkTrackUpload({
  album,
  onSubmit,
}: Pick<BulkTrackUploadFormProps, 'album' | 'onSubmit'>) {
  const [tracks, setTracks] = useState<BulkTrackItem[]>([]);
  const [tracksWithCovers, setTracksWithCovers] = useState<TrackWithCover[]>([]);
  const [selectedCoverTrackId, setSelectedCoverTrackId] = useState<string | null>(null);
  const [isScanningCovers, setIsScanningCovers] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const trackIds = useMemo(() => tracks.map((t) => t.id).join(','), [tracks]);

  useEffect(() => {
    if (tracks.length === 0) {
      return;
    }

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

  const addFiles = useCallback(
    (files: FileList | null) => {
      if (!files?.length) return;

      const audioFiles = Array.from(files).filter((f) => f.type.startsWith('audio/'));
      if (audioFiles.length === 0) return;

      const context = {
        artists: album.artists?.map((a) => a.name) ?? [],
        album: album.name ?? '',
      };

      const newTracks: BulkTrackItem[] = audioFiles.map((file, i) => ({
        id: `${Date.now()}-${i}-${file.name}`,
        file,
        title: cleanFilenameToTitle(file.name, context),
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
    },
    [album.artists, album.name],
  );

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
    setTracksWithCovers([]);
    setSelectedCoverTrackId(null);
    setTracks([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (tracks.length === 0) return;
      const selectedCover =
        selectedCoverTrackId != null
          ? (tracksWithCovers.find((t) => t.trackId === selectedCoverTrackId)?.coverFile ?? null)
          : null;
      onSubmit(tracks, selectedCover);
    },
    [tracks, selectedCoverTrackId, tracksWithCovers, onSubmit],
  );

  return {
    tracks,
    isScanningCovers,
    tracksWithCovers,
    selectedCoverTrackId,
    setSelectedCoverTrackId,
    fileInputRef,
    addFiles,
    updateTrack,
    removeTrack,
    clearAll,
    handleSubmit,
  };
}
