import { TextField } from '@/components/form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cleanFilenameToTitle } from '@/lib/clean-audio-filename.ts';
import { cn } from '@/lib/utils';
import { extractCoverFromAudioFile } from '@/lib/audio-metadata';
import { CircleNotchIcon, ImageIcon, TrashIcon, UploadSimpleIcon } from '@phosphor-icons/react';
import { ZodAlbumInfer } from '@repo/contracts';
import { Link } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface BulkTrackItem {
  id: string;
  file: File;
  title: string;
  trackNumber: number;
  diskNumber: number;
  explicit: boolean;
}

export interface TrackWithCover {
  trackId: string;
  trackName: string;
  coverFile: File;
  previewUrl: string;
}

interface BulkTrackUploadFormProps {
  album: ZodAlbumInfer;
  onSubmit: (tracks: BulkTrackItem[], selectedCover: File | null) => void | Promise<void>;
  isLoading?: boolean;
}

const AUDIO_ACCEPT = 'audio/*';

export function BulkTrackUploadForm({ album, onSubmit, isLoading = false }: BulkTrackUploadFormProps) {
  const [tracks, setTracks] = useState<BulkTrackItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
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
          results.some((r) => r.trackId === prev) ? prev : results[0]?.trackId ?? null,
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

  const removeTrack = useCallback((id: string) => {
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
  }, [tracks]);

  const clearAll = useCallback(() => {
    setTracksWithCovers([]);
    setSelectedCoverTrackId(null);
    setTracks([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      addFiles(e.dataTransfer?.files ?? null);
    },
    [addFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      addFiles(e.target.files);
      e.target.value = '';
    },
    [addFiles],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (tracks.length === 0) return;
      const selectedCover =
        selectedCoverTrackId != null
          ? tracksWithCovers.find((t) => t.trackId === selectedCoverTrackId)?.coverFile ?? null
          : null;
      onSubmit(tracks, selectedCover);
    },
    [tracks, selectedCoverTrackId, tracksWithCovers, onSubmit],
  );

  const hasInvalidTracks = tracks.some(
    (t) => !t.title.trim() || t.trackNumber < 1 || t.diskNumber < 1,
  );

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            relative flex min-h-[180px] cursor-pointer flex-col items-center justify-center
            rounded-xl border-2 border-dashed transition-colors
            ${isDragging ? 'border-primary bg-primary/10' : 'border-muted-foreground/25 hover:border-muted-foreground/50'}
          `}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={AUDIO_ACCEPT}
            multiple
            className="sr-only"
            onChange={handleFileInputChange}
          />
          {tracks.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 text-center">
              <UploadSimpleIcon size={32} className="text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                Drop audio files here or click to select
              </p>
              <p className="text-xs text-muted-foreground">
                Supports MP3, WAV, FLAC, AAC, and other audio formats
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 px-4 text-center">
              <UploadSimpleIcon size={24} className="text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Drop more files or click to add</p>
            </div>
          )}
        </div>

        {tracks.length > 0 && (
          <>
            <Separator />
            {isScanningCovers && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CircleNotchIcon className="h-4 w-4 animate-spin" />
                Scanning tracks for cover art...
              </div>
            )}
            {!isScanningCovers && tracksWithCovers.length > 0 && (
              <CoverSelectionBanner
                albumHasCover={!!album.cover?.url}
                tracksWithCovers={tracksWithCovers}
                selectedCoverTrackId={selectedCoverTrackId}
                onSelectCover={setSelectedCoverTrackId}
              />
            )}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">
                  {tracks.length} track{tracks.length !== 1 ? 's' : ''} ready
                </h3>
                <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
                  Clear all
                </Button>
              </div>
              <div className="flex flex-col gap-3">
                {tracks.map((track) => (
                  <BulkTrackCard
                    key={track.id}
                    track={track}
                    onUpdate={(updates) => updateTrack(track.id, updates)}
                    onRemove={() => removeTrack(track.id)}
                  />
                ))}
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-4">
              <Button asChild variant="secondary" type="button" className="min-w-32">
                <Link to="..">Cancel</Link>
              </Button>
              <Button type="submit" disabled={hasInvalidTracks || isLoading} className="min-w-32">
                {isLoading ? (
                  <>
                    <CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <UploadSimpleIcon className="mr-2 h-4 w-4" />
                    Upload {tracks.length} track{tracks.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}

interface CoverSelectionBannerProps {
  albumHasCover: boolean;
  tracksWithCovers: TrackWithCover[];
  selectedCoverTrackId: string | null;
  onSelectCover: (trackId: string | null) => void;
}

function CoverSelectionBanner({
  albumHasCover,
  tracksWithCovers,
  selectedCoverTrackId,
  onSelectCover,
}: CoverSelectionBannerProps) {
  const message = albumHasCover
    ? `Cover art found in ${tracksWithCovers.length} track${tracksWithCovers.length !== 1 ? 's' : ''}. Would you like to replace the current album cover?`
    : `Cover art found in ${tracksWithCovers.length} track${tracksWithCovers.length !== 1 ? 's' : ''}. Would you like to use it as the album cover?`;

  return (
    <Alert className="border-primary/20 bg-primary/5">
      <ImageIcon size={20} className="text-primary" />
      <AlertTitle className="text-primary">Cover art detected</AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p className="text-muted-foreground">{message}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onSelectCover(null)}
            className={cn(
              'flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-left text-sm transition-colors',
              selectedCoverTrackId === null
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50',
            )}
          >
            <span className="font-medium">Don&apos;t use</span>
          </button>
          {tracksWithCovers.map(({ trackId, trackName, previewUrl }) => (
            <button
              key={trackId}
              type="button"
              onClick={() => onSelectCover(trackId)}
              className={cn(
                'flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-left text-sm transition-colors',
                selectedCoverTrackId === trackId
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50',
              )}
            >
              <img
                src={previewUrl}
                alt=""
                className="size-10 shrink-0 rounded object-cover"
              />
              <span className="max-w-32 truncate font-medium" title={trackName}>
                {trackName}
              </span>
            </button>
          ))}
        </div>
      </AlertDescription>
    </Alert>
  );
}

interface BulkTrackCardProps {
  track: BulkTrackItem;
  onUpdate: (updates: Partial<Omit<BulkTrackItem, 'id' | 'file'>>) => void;
  onRemove: () => void;
}

function BulkTrackCard({ track, onUpdate, onRemove }: BulkTrackCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 border-b pb-3">
        <CardTitle className="text-sm font-medium truncate" title={track.file.name}>
          {track.file.name}
        </CardTitle>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          aria-label="Remove track"
        >
          <TrashIcon size={16} />
        </Button>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <TextField
          label="Track Title"
          placeholder="e.g. Smells Like Teen Spirit"
          value={track.title}
          onChange={(value) => onUpdate({ title: value })}
          onBlur={() => {}}
        />
        <div className="flex gap-4">
          <div className="w-24">
            <TextField
              label="Disk No."
              placeholder="1"
              // @ts-expect-error TextField types are too strict
              type="number"
              value={String(track.diskNumber)}
              onChange={(value) => onUpdate({ diskNumber: Number(value) || 1 })}
              onBlur={() => {}}
            />
          </div>
          <div className="flex-1">
            <TextField
              label="Track No."
              placeholder="1"
              // @ts-expect-error TextField types are too strict
              type="number"
              value={String(track.trackNumber)}
              onChange={(value) => onUpdate({ trackNumber: Number(value) || 1 })}
              onBlur={() => {}}
            />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id={`explicit-${track.id}`}
            checked={track.explicit}
            onCheckedChange={(checked) => onUpdate({ explicit: !!checked })}
          />
          <Label htmlFor={`explicit-${track.id}`}>Explicit Content</Label>
        </div>
      </CardContent>
    </Card>
  );
}
