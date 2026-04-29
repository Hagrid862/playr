import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCreateLibraryAlbum } from '@/hooks/api/library-albums/useCreateLibraryAlbum';
import { useUploadLibraryAlbumCover } from '@/hooks/api/library-albums/useUploadLibraryAlbumCover';
import { useLibraryArtists } from '@/hooks/api/library-artists/useLibraryArtists';
import { useBulkCreateLibraryTracks } from '@/hooks/api/library-tracks/useBulkCreateLibraryTracks';
import { useLibraryStore } from '@/stores/library.store';
import { CircleNotchIcon, UploadSimpleIcon } from '@phosphor-icons/react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CoverSelectionBanner } from '../../tracks/bulk/CoverSelectionBanner';
import { AlbumAudioDropCard } from './AlbumAudioDropCard';
import { LibraryAlbumFromFilesProcessingOverlay } from './LibraryAlbumFromFilesProcessingOverlay';
import { LibraryAlbumFromFilesTracksSection } from './LibraryAlbumFromFilesTracksSection';
import { LibraryAlbumMetadataSection } from './LibraryAlbumMetadataSection';
import { useLibraryAlbumFromFilesForm } from './useLibraryAlbumFromFilesForm';

export interface LibraryAlbumFromFilesFormProps {
  cancelTo: string;
  initialArtistId?: string;
}

export function LibraryAlbumFromFilesForm({
  cancelTo,
  initialArtistId,
}: LibraryAlbumFromFilesFormProps) {
  const navigate = useNavigate();
  const { libraryId } = useLibraryStore();
  const { isLoading: isLoadingArtists } = useLibraryArtists();
  const artists = useLibraryStore((state) => state.privateArtists);

  const { mutateAsync: createAlbum, isPending: isCreatingAlbum } = useCreateLibraryAlbum();
  const { mutateAsync: uploadCover, isPending: isUploadingCover } = useUploadLibraryAlbumCover();
  const { mutateAsync: bulkCreateTracks, isPending: isUploadingTracks } =
    useBulkCreateLibraryTracks();

  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    formData,
    tracks,
    tracksWithCovers,
    coverGroups,
    selectedCoverTrackId,
    setSelectedCoverTrackId,
    setManualAlbumCover,
    removeManualAlbumCover,
    manualAlbumCoverPreviewUrl,
    coverFileForUpload,
    isScanningMetadata,
    isScanningCovers,
    fileInputRef,
    addFiles,
    updateTrack,
    removeTrack,
    clearTracks,
    updateFormData,
    isFormValid,
  } = useLibraryAlbumFromFilesForm({ initialArtistId });

  const embeddedCoverPreviewUrl = useMemo(() => {
    if (selectedCoverTrackId == null) return null;
    return tracksWithCovers.find((t) => t.trackId === selectedCoverTrackId)?.previewUrl ?? null;
  }, [selectedCoverTrackId, tracksWithCovers]);

  const coverPreviewUrl = manualAlbumCoverPreviewUrl ?? embeddedCoverPreviewUrl;

  const handleSelectCover = useCallback(
    (trackId: string | null) => {
      setSelectedCoverTrackId(trackId);
      if (trackId != null) {
        removeManualAlbumCover();
      }
    },
    [setSelectedCoverTrackId, removeManualAlbumCover],
  );

  const handleRemoveCover = useCallback(() => {
    if (manualAlbumCoverPreviewUrl) {
      removeManualAlbumCover();
    } else {
      setSelectedCoverTrackId(null);
    }
  }, [manualAlbumCoverPreviewUrl, removeManualAlbumCover, setSelectedCoverTrackId]);

  const progressStep = isCreatingAlbum
    ? 'Creating album...'
    : isUploadingCover
      ? 'Uploading cover...'
      : isUploadingTracks
        ? `Uploading ${tracks.length} track${tracks.length !== 1 ? 's' : ''}...`
        : null;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitError(null);
      if (!isFormValid || !libraryId) return;

      try {
        const album = await createAlbum({
          name: formData.name,
          description: formData.description,
          type: formData.type,
          artistId: formData.artistId,
          releaseDate: formData.releaseDate,
        });

        if (!album.data) throw new Error('Failed to create album');

        if (coverFileForUpload) {
          await uploadCover({ id: album.data.id, file: coverFileForUpload });
        }

        await bulkCreateTracks({
          album: album.data,
          tracks,
          artistIds: [formData.artistId],
        });

        toast.success(
          `Successfully created album and uploaded ${tracks.length} track${tracks.length !== 1 ? 's' : ''}`,
        );
        navigate({ to: '/app/library/albums/$id', params: { id: album.data.id } });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create album';
        setSubmitError(message);
        toast.error(message);
      }
    },
    [
      isFormValid,
      libraryId,
      formData,
      coverFileForUpload,
      tracks,
      createAlbum,
      uploadCover,
      bulkCreateTracks,
      navigate,
    ],
  );

  const isSubmitting = isCreatingAlbum || isUploadingCover || isUploadingTracks;
  const isProcessing = isScanningMetadata || isScanningCovers;
  const processingMessage =
    isScanningMetadata && isScanningCovers
      ? 'Scanning metadata and cover art...'
      : isScanningMetadata
        ? 'Scanning metadata...'
        : 'Scanning tracks for cover art...';

  const submitLabel =
    tracks.length === 0
      ? 'Add audio files to continue'
      : `Create album & upload ${tracks.length} track${tracks.length !== 1 ? 's' : ''}`;

  return (
    <div className="relative flex w-full min-w-0 flex-col gap-6 lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-hidden">
      {isProcessing && <LibraryAlbumFromFilesProcessingOverlay message={processingMessage} />}

      <form
        onSubmit={handleSubmit}
        className="flex w-full min-w-0 flex-col gap-6 lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-hidden"
      >
        <div className="flex w-full min-w-0 flex-col gap-6 lg:min-h-0 lg:flex-1 lg:flex-row lg:items-stretch lg:gap-8 xl:gap-12 2xl:gap-16">
          <aside className="w-full shrink-0 lg:w-[min(100%,24rem)] lg:min-h-0 lg:max-h-full lg:overflow-y-auto lg:overscroll-contain lg:pr-1 xl:w-[min(100%,28rem)] 2xl:w-[30rem]">
            <LibraryAlbumMetadataSection
              formData={formData}
              artists={artists}
              isLoadingArtists={isLoadingArtists}
              coverPreviewUrl={coverPreviewUrl}
              onUpdate={updateFormData}
              onManualCoverFile={setManualAlbumCover}
              onRemoveCover={handleRemoveCover}
            />
          </aside>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:min-h-0 lg:border-l lg:border-border/60 lg:pl-8 xl:pl-12 2xl:pl-16">
            <div className="flex flex-col gap-6 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-2 xl:pr-3">
              <Separator className="lg:hidden" />

              {tracks.length > 0 && !isScanningCovers && tracksWithCovers.length > 0 && (
                <CoverSelectionBanner
                  variant="prominent"
                  albumHasCover={!!manualAlbumCoverPreviewUrl}
                  tracksWithCovers={tracksWithCovers}
                  coverGroups={coverGroups}
                  selectedCoverTrackId={selectedCoverTrackId}
                  onSelectCover={handleSelectCover}
                />
              )}

              {tracks.length > 0 && !isScanningCovers && tracksWithCovers.length > 0 && (
                <Separator />
              )}

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Audio files</h3>
                <AlbumAudioDropCard
                  fileInputRef={fileInputRef}
                  onAddFiles={addFiles}
                  compact={tracks.length > 0}
                />
              </div>

              {tracks.length > 0 && (
                <>
                  <Separator />

                  <LibraryAlbumFromFilesTracksSection
                    tracks={tracks}
                    submitError={submitError}
                    isFormValid={isFormValid}
                    isSubmitting={isSubmitting}
                    isLoadingArtists={isLoadingArtists}
                    progressStep={progressStep}
                    cancelTo={cancelTo}
                    showActions={false}
                    onUpdateTrack={updateTrack}
                    onRemoveTrack={removeTrack}
                    onClearTracks={clearTracks}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        <Separator className="shrink-0 lg:mt-0" />

        <div className="flex shrink-0 flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button asChild variant="secondary" type="button" className="min-w-32 sm:min-w-36">
            <Link to={cancelTo}>Cancel</Link>
          </Button>
          <Button
            type="submit"
            disabled={!isFormValid || isSubmitting || isLoadingArtists}
            className="min-w-32 sm:min-w-36"
          >
            {isSubmitting ? (
              <>
                <CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />
                {progressStep ?? 'Creating...'}
              </>
            ) : (
              <>
                <UploadSimpleIcon className="mr-2 h-4 w-4" />
                {submitLabel}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
