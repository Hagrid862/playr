import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CircleNotchIcon, UploadSimpleIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { BulkTrackCard } from './BulkTrackCard';
import { CoverSelectionBanner } from './CoverSelectionBanner';
import type { BulkTrackUploadFormProps } from './BulkTrackUploadForm.types';
import { useBulkTrackUpload } from './useBulkTrackUpload';

const AUDIO_ACCEPT = 'audio/*';

export function BulkTrackUploadForm({ album, onSubmit, isLoading = false }: BulkTrackUploadFormProps) {
  const [isDragging, setIsDragging] = useState(false);
  const {
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
  } = useBulkTrackUpload({ album, onSubmit });

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
