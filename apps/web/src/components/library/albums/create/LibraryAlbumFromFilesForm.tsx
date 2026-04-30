import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCreateLibraryAlbum } from '@/hooks/api/library-albums/useCreateLibraryAlbum';
import { useUploadLibraryAlbumCover } from '@/hooks/api/library-albums/useUploadLibraryAlbumCover';
import { useCreateLibraryArtist } from '@/hooks/api/library-artists/useCreateLibraryArtist';
import { useLibraryArtists } from '@/hooks/api/library-artists/useLibraryArtists';
import { useBulkCreateLibraryTracks } from '@/hooks/api/library-tracks/useBulkCreateLibraryTracks';
import { useLibraryStore } from '@/stores/library.store';
import { CircleNotchIcon, UploadSimpleIcon } from '@phosphor-icons/react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CoverSelectionBanner } from '../../tracks/bulk/CoverSelectionBanner';
import { AlbumAudioDropCard } from './AlbumAudioDropCard';
import { CreateLibraryArtistNameModal } from './CreateLibraryArtistNameModal';
import { LibraryAlbumFromFilesProcessingOverlay } from './LibraryAlbumFromFilesProcessingOverlay';
import { LibraryAlbumFromFilesTracksSection } from './LibraryAlbumFromFilesTracksSection';
import { LibraryAlbumMetadataSection } from './LibraryAlbumMetadataSection';
import { makeLocalPendingArtistId, isLocalPendingArtistId, normalizeLibraryArtistNameForMatch } from './pendingLibraryArtist';
import { useLibraryAlbumFromFilesForm } from './useLibraryAlbumFromFilesForm';

/** Select sentinel: opens the “new artist” modal instead of setting `artistId`. */
const CREATE_NEW_ARTIST_SELECT_VALUE = '__create_new_artist__';

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
  const { mutateAsync: createLibraryArtist, isPending: isCreatingArtist } =
    useCreateLibraryArtist();

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createArtistModalOpen, setCreateArtistModalOpen] = useState(false);
  const [pendingArtists, setPendingArtists] = useState<{ id: string; name: string }[]>([]);

  const {
    formData,
    suggestedArtistName,
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

  useEffect(() => {
    if (isLoadingArtists) return;
    const raw = suggestedArtistName?.trim();
    if (!raw) return;
    if (formData.artistId !== '') return;

    const sugNorm = normalizeLibraryArtistNameForMatch(raw);
    const matches = artists.filter(
      (a) => normalizeLibraryArtistNameForMatch(a.name) === sugNorm,
    );
    if (matches.length > 1) return;
    if (matches.length === 1) {
      const id = matches[0]?.id;
      if (id) updateFormData('artistId', id);
      return;
    }
    if (pendingArtists.some((p) => normalizeLibraryArtistNameForMatch(p.name) === sugNorm)) {
      return;
    }
    const id = makeLocalPendingArtistId();
    setPendingArtists((prev) => [...prev, { id, name: raw }]);
    updateFormData('artistId', id);
  }, [
    artists,
    formData.artistId,
    isLoadingArtists,
    pendingArtists,
    suggestedArtistName,
    updateFormData,
  ]);

  const embeddedCoverPreviewUrl = useMemo(() => {
    if (selectedCoverTrackId == null) return null;
    return tracksWithCovers.find((t) => t.trackId === selectedCoverTrackId)?.previewUrl ?? null;
  }, [selectedCoverTrackId, tracksWithCovers]);

  const coverPreviewUrl = manualAlbumCoverPreviewUrl ?? embeddedCoverPreviewUrl;

  const artistSelectOptions = useMemo(() => {
    const createOption = { value: CREATE_NEW_ARTIST_SELECT_VALUE, label: '+ Create new artist…' };
    const serverOpts = artists.map((a) => ({ value: a.id, label: a.name }));
    const pendingOpts = pendingArtists.map((a) => ({
      value: a.id,
      label: `${a.name} (new)`,
    }));
    return [createOption, ...pendingOpts, ...serverOpts];
  }, [artists, pendingArtists]);

  const handleArtistIdChange = useCallback(
    (value: string) => {
      if (value === CREATE_NEW_ARTIST_SELECT_VALUE) {
        setCreateArtistModalOpen(true);
        return;
      }
      updateFormData('artistId', value);
    },
    [updateFormData],
  );

  const handleConfirmNewArtistName = useCallback(
    (name: string) => {
      const id = makeLocalPendingArtistId();
      setPendingArtists((prev) => [...prev, { id, name }]);
      updateFormData('artistId', id);
    },
    [updateFormData],
  );

  const handleClearStagedArtist = useCallback(() => {
    const id = formData.artistId;
    if (!isLocalPendingArtistId(id)) return;
    setPendingArtists((prev) => prev.filter((p) => p.id !== id));
    updateFormData('artistId', '');
  }, [formData.artistId, updateFormData]);

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

  const progressStep = isCreatingArtist
    ? 'Creating artist...'
    : isCreatingAlbum
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
        let artistId = formData.artistId;

        if (isLocalPendingArtistId(artistId)) {
          const pending = pendingArtists.find((p) => p.id === artistId);
          if (!pending?.name.trim()) {
            throw new Error('Artist name is missing');
          }
          const createdArtist = await createLibraryArtist({ name: pending.name.trim() });
          if (!createdArtist.data) {
            throw new Error('Failed to create artist');
          }
          artistId = createdArtist.data.id;
        }

        const album = await createAlbum({
          name: formData.name,
          description: formData.description,
          type: formData.type,
          artistId,
          releaseDate: formData.releaseDate,
        });

        if (!album.data) throw new Error('Failed to create album');

        if (coverFileForUpload) {
          await uploadCover({ id: album.data.id, file: coverFileForUpload });
        }

        await bulkCreateTracks({
          album: album.data,
          tracks,
          artistIds: [artistId],
        });

        toast.success(
          `Successfully created album and uploaded ${tracks.length} track${tracks.length !== 1 ? 's' : ''}`,
        );
        setPendingArtists([]);
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
      pendingArtists,
      createLibraryArtist,
      createAlbum,
      uploadCover,
      bulkCreateTracks,
      navigate,
    ],
  );

  const isSubmitting = isCreatingArtist || isCreatingAlbum || isUploadingCover || isUploadingTracks;
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
      <CreateLibraryArtistNameModal
        open={createArtistModalOpen}
        onOpenChange={setCreateArtistModalOpen}
        pendingArtistNames={pendingArtists.map((p) => p.name)}
        onConfirm={handleConfirmNewArtistName}
      />
      {isProcessing && <LibraryAlbumFromFilesProcessingOverlay message={processingMessage} />}

      <form
        onSubmit={handleSubmit}
        className="flex w-full min-w-0 flex-col gap-6 lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-hidden"
      >
        <div className="flex w-full min-w-0 flex-col gap-6 lg:min-h-0 lg:flex-1 lg:flex-row lg:items-stretch lg:gap-8 xl:gap-12 2xl:gap-16">
          <aside className="w-full shrink-0 lg:w-[min(100%,24rem)] lg:min-h-0 lg:max-h-full lg:overflow-y-auto lg:overscroll-contain lg:px-3 xl:w-[min(100%,28rem)] 2xl:w-[30rem]">
            <LibraryAlbumMetadataSection
              formData={formData}
              artists={artists}
              artistSelectOptions={artistSelectOptions}
              isLoadingArtists={isLoadingArtists}
              isStagedNewArtistSelected={isLocalPendingArtistId(formData.artistId)}
              coverPreviewUrl={coverPreviewUrl}
              onUpdate={updateFormData}
              onArtistIdChange={handleArtistIdChange}
              onClearStagedArtist={handleClearStagedArtist}
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
