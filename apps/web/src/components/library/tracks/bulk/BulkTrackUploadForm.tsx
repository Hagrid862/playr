import { GlobalDropzone } from '@/components/ui/GlobalDropzone';
import { Separator } from '@/components/ui/separator';
import { CircleNotchIcon } from '@phosphor-icons/react';
import { BulkTrackActions } from './BulkTrackActions';
import { BulkTrackList } from './BulkTrackList';
import type { BulkTrackUploadFormProps } from './BulkTrackUploadForm.types';
import { CoverSelectionBanner } from './CoverSelectionBanner';
import { useBulkTrackUpload } from './useBulkTrackUpload';

export function BulkTrackUploadForm({
  album,
  onSubmit,
  isLoading = false,
}: BulkTrackUploadFormProps) {
  const {
    tracks,
    isScanningCovers,
    tracksWithCovers,
    selectedCoverTrackId,
    setSelectedCoverTrackId,
    addFiles,
    updateTrack,
    removeTrack,
    clearAll,
    handleSubmit,
  } = useBulkTrackUpload({ album, onSubmit });

  const hasInvalidTracks = tracks.some(
    (t) => !t.title.trim() || t.trackNumber < 1 || t.diskNumber < 1,
  );

  return (
    <GlobalDropzone
      onDrop={addFiles}
      className="flex flex-col gap-6"
      overlayTitle="Drop audio files to upload"
      overlayDescription="Your tracks will be processed automatically"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {tracks.length > 0 && (
          <>
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

            <BulkTrackList
              tracks={tracks}
              onUpdateTrack={updateTrack}
              onRemoveTrack={removeTrack}
              onClearAll={clearAll}
            />

            <Separator />

            <BulkTrackActions
              tracksCount={tracks.length}
              isLoading={isLoading}
              hasInvalidTracks={hasInvalidTracks}
            />
          </>
        )}

        {tracks.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/5 py-20">
            <p className="text-sm text-muted-foreground">
              Drop audio files anywhere to start uploading
            </p>
          </div>
        )}
      </form>
    </GlobalDropzone>
  );
}

