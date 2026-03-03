import { Separator } from '@/components/ui/separator';
import { useCreateLibraryAlbum } from '@/hooks/api/library-albums/useCreateLibraryAlbum';
import { useUploadLibraryAlbumCover } from '@/hooks/api/library-albums/useUploadLibraryAlbumCover';
import { useBulkCreateLibraryTracks } from '@/hooks/api/library-tracks/useBulkCreateLibraryTracks';
import { useLibraryArtists } from '@/hooks/api/library-artists/useLibraryArtists';
import { useBulkAlbumUploadForm } from '@/hooks/forms/useBulkAlbumUploadForm';
import { useLibraryStore } from '@/stores/library.store';
import { useNavigate } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { CoverSelectionBanner } from '../../tracks/CoverSelectionBanner';
import { BulkAlbumDetailsSection } from './BulkAlbumDetailsSection';
import { BulkAlbumFileDropzone } from './BulkAlbumFileDropzone';
import { BulkAlbumProcessingOverlay } from './BulkAlbumProcessingOverlay';
import { BulkAlbumTracksSection } from './BulkAlbumTracksSection';

export function BulkAlbumUploadForm() {
  const navigate = useNavigate();
  const { libraryId } = useLibraryStore();
  const { isLoading: isLoadingArtists } = useLibraryArtists();
  const artists = useLibraryStore((state) => state.privateArtists);

  const { mutateAsync: createAlbum, isPending: isCreatingAlbum } = useCreateLibraryAlbum();
  const { mutateAsync: uploadCover, isPending: isUploadingCover } =
    useUploadLibraryAlbumCover();
  const { mutateAsync: bulkCreateTracks, isPending: isUploadingTracks } =
    useBulkCreateLibraryTracks();

  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
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
  } = useBulkAlbumUploadForm();

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

        if (selectedCoverFile) {
          await uploadCover({ id: album.data.id, file: selectedCoverFile });
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
      selectedCoverFile,
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

  return (
    <div className="flex flex-col gap-6">
      {isProcessing && (
        <BulkAlbumProcessingOverlay message={processingMessage} />
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <BulkAlbumFileDropzone
          tracksCount={tracks.length}
          onFilesAdded={addFiles}
          fileInputRef={fileInputRef}
        />

        {tracks.length > 0 && (
          <>
            <Separator />

            {!isScanningCovers && tracksWithCovers.length > 0 && (
              <CoverSelectionBanner
                albumHasCover={false}
                tracksWithCovers={tracksWithCovers}
                selectedCoverTrackId={selectedCoverTrackId}
                onSelectCover={setSelectedCoverTrackId}
              />
            )}

            <BulkAlbumDetailsSection
              formData={formData}
              artists={artists}
              isLoadingArtists={isLoadingArtists}
              onUpdate={updateFormData}
            />

            <Separator />

            <BulkAlbumTracksSection
              tracks={tracks}
              submitError={submitError}
              isFormValid={isFormValid}
              isSubmitting={isSubmitting}
              isLoadingArtists={isLoadingArtists}
              progressStep={progressStep}
              onUpdateTrack={updateTrack}
              onRemoveTrack={removeTrack}
              onClearAll={clearAll}
            />
          </>
        )}
      </form>
    </div>
  );
}
