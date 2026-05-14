import { AlbumAudioDropCard } from '@/components/library/albums/create/AlbumAudioDropCard';
import { CreateLibraryGenreNameModal } from '@/components/library/albums/create/CreateLibraryGenreNameModal';
import { LibraryAlbumFromFilesTracksSection } from '@/components/library/albums/create/LibraryAlbumFromFilesTracksSection';
import { CoverSelectionBanner } from '@/components/library/tracks/bulk/CoverSelectionBanner';
import { useBulkTrackUpload } from '@/components/library/tracks/bulk/useBulkTrackUpload';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { GlobalDropzone } from '@/components/ui/GlobalDropzone';
import { Separator } from '@/components/ui/separator';
import { useLibraryAlbum } from '@/hooks/api/library-albums/useLibraryAlbum';
import { useUploadLibraryAlbumCover } from '@/hooks/api/library-albums/useUploadLibraryAlbumCover';
import { useLibraryGenres } from '@/hooks/api/library-genres/useLibraryGenres';
import { useBulkCreateLibraryTracks } from '@/hooks/api/library-tracks/useBulkCreateLibraryTracks';
import { makeLocalPendingGenreId } from '@/components/library/albums/create/pendingLibraryGenre';
import type { BulkTrackItem } from '@/lib/types/library';
import type { ZodAlbumInfer, ZodGenreInfer } from '@repo/contracts';
import { CircleNotchIcon, DiscIcon, InfoIcon, UploadSimpleIcon } from '@phosphor-icons/react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

export const Route = createFileRoute('/app/library/albums/$id/add-content/')({
  component: AddContentPage,
});

function AddContentPage() {
  const { id } = Route.useParams();
  const { data: albumResponse, isLoading: isAlbumLoading, error: albumError } = useLibraryAlbum(id);

  if (isAlbumLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <CircleNotchIcon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (albumError || !albumResponse || !albumResponse.success || !albumResponse.data) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-destructive">Failed to load album</p>
        <Button variant="outline" onClick={() => window.history.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  return <AddContentTracksWorkspace album={albumResponse.data} />;
}

function AddContentTracksWorkspace({ album }: { album: ZodAlbumInfer }) {
  const navigate = useNavigate();
  const { mutateAsync: bulkCreateTracks, isPending: isBulkPending } = useBulkCreateLibraryTracks();
  const { mutateAsync: uploadCover, isPending: isCoverPending } = useUploadLibraryAlbumCover();

  const { data: genresResponse, isLoading: isLoadingGenres } = useLibraryGenres({
    page: 1,
    limit: 100,
  });
  const genres = useMemo<ZodGenreInfer[]>(
    () => genresResponse?.data?.items ?? [],
    [genresResponse],
  );

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingGenres, setPendingGenres] = useState<{ id: string; name: string }[]>([]);
  const [createGenreModalOpen, setCreateGenreModalOpen] = useState(false);
  const [activeGenreCreationCallback, setActiveGenreCreationCallback] = useState<
    ((genreId: string) => void) | null
  >(null);

  const handleRequestCreateGenre = useCallback((onCreated: (genreId: string) => void) => {
    setActiveGenreCreationCallback(() => onCreated);
    setCreateGenreModalOpen(true);
  }, []);

  const handleConfirmNewGenreName = useCallback(
    (name: string) => {
      const genreId = makeLocalPendingGenreId();
      setPendingGenres((prev) => [...prev, { id: genreId, name }]);
      if (activeGenreCreationCallback) {
        activeGenreCreationCallback(genreId);
        setActiveGenreCreationCallback(null);
      }
    },
    [activeGenreCreationCallback],
  );

  const onSubmitTracks = useCallback(
    async (tracks: BulkTrackItem[], selectedCover: File | null) => {
      setSubmitError(null);
      try {
        if (selectedCover) {
          await uploadCover({ id: album.id, file: selectedCover });
        }
        await bulkCreateTracks({ album, tracks });
        toast.success(
          selectedCover
            ? `Uploaded ${tracks.length} track${tracks.length !== 1 ? 's' : ''} and updated album cover`
            : `Successfully uploaded ${tracks.length} track${tracks.length !== 1 ? 's' : ''}`,
        );
        navigate({ to: '/app/library/albums/$id', params: { id: album.id } });
      } catch (error) {
        console.error(error);
        setSubmitError('Failed to upload tracks. Please try again.');
        toast.error('Failed to upload tracks. Please try again.');
        throw error;
      }
    },
    [album, bulkCreateTracks, navigate, uploadCover],
  );

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
  } = useBulkTrackUpload({ album, onSubmit: onSubmitTracks });

  const usedGenreIdsFromTracks = useMemo(() => {
    const used = new Set<string>();
    for (const t of tracks) {
      for (const gid of t.genreIds ?? []) {
        used.add(gid);
      }
    }
    return used;
  }, [tracks]);

  const activePendingGenres = useMemo(
    () => pendingGenres.filter((p) => usedGenreIdsFromTracks.has(p.id)),
    [pendingGenres, usedGenreIdsFromTracks],
  );

  const hasInvalidTracks = tracks.some(
    (t) => !t.title.trim() || t.trackNumber < 1 || t.diskNumber < 1,
  );
  const isFormValid = tracks.length > 0 && !hasInvalidTracks && !isLoadingGenres;
  const isSubmitting = isBulkPending || isCoverPending;

  return (
    <div className="-mx-4 flex max-lg:h-full min-h-0 w-[calc(100%+2rem)] min-w-0 flex-col gap-6 overflow-y-auto px-4 pb-6 md:pb-8 lg:h-[calc(100dvh-15rem)] lg:max-h-[calc(100dvh-15rem)] lg:min-h-[calc(100dvh-15rem)] lg:px-6 xl:px-8">
      <div className="mx-auto flex min-h-0 w-full min-w-0 max-w-[1920px] flex-col gap-6 overflow-visible lg:flex-1 lg:min-h-0">
        <div className="flex shrink-0 flex-col gap-2">
          <Alert className="border-primary/20 bg-primary/5">
            <InfoIcon size={20} className="text-primary" />
            <AlertTitle className="text-primary">Add tracks</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              Add one or more audio files to{' '}
              <span className="font-medium text-foreground">{album.name}</span>. Metadata is read
              from files; edit titles, disc/track numbers, explicit flag, and genres before
              uploading — same flow as when creating an album from files.
            </AlertDescription>
          </Alert>
        </div>

        <CreateLibraryGenreNameModal
          open={createGenreModalOpen}
          onOpenChange={(open) => {
            setCreateGenreModalOpen(open);
            if (!open) setActiveGenreCreationCallback(null);
          }}
          pendingGenreNames={activePendingGenres.map((p) => p.name)}
          existingGenres={genres.map((g) => ({ id: g.id, name: g.name, slug: g.slug }))}
          onConfirm={handleConfirmNewGenreName}
        />

        <GlobalDropzone
          onDrop={addFiles}
          overlayTitle="Drop audio files to upload"
          overlayDescription="Your tracks will be processed automatically"
        >
          <form
            onSubmit={handleSubmit}
            className="relative flex w-full min-w-0 flex-col gap-6 lg:min-h-0 lg:flex-1 lg:flex-col overflow-visible"
          >
            {/* Row 1: short album glance */}
            <div className="flex w-full min-w-0 flex-row items-center gap-4 rounded-xl border border-border/60 bg-muted/10 px-4 py-3 sm:gap-5 sm:px-5">
              <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-stone-900 shadow-sm sm:size-20">
                {album.cover?.url ? (
                  <img src={album.cover.url} alt={album.name} className="size-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <DiscIcon className="size-8 text-stone-400 sm:size-10" weight="duotone" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Album
                </p>
                <p className="truncate text-base font-semibold leading-tight sm:text-lg">
                  {album.name}
                </p>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {album.artists?.map((a) => a.name).join(', ') ?? 'Unknown artist'}
                </p>
              </div>
            </div>

            <Separator />

            {/* Row 2+: song upload (full width) */}
            <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-6 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
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
                  {isScanningCovers && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CircleNotchIcon className="h-4 w-4 animate-spin" />
                      Scanning tracks for cover art...
                    </div>
                  )}

                  {!isScanningCovers && tracksWithCovers.length > 0 && (
                    <CoverSelectionBanner
                      variant="prominent"
                      albumHasCover={!!album.cover?.url}
                      tracksWithCovers={tracksWithCovers}
                      selectedCoverTrackId={selectedCoverTrackId}
                      onSelectCover={setSelectedCoverTrackId}
                    />
                  )}

                  {tracksWithCovers.length > 0 && !isScanningCovers && <Separator />}

                  <LibraryAlbumFromFilesTracksSection
                    tracks={tracks}
                    genres={genres}
                    pendingGenres={activePendingGenres}
                    isLoadingGenres={isLoadingGenres}
                    submitError={submitError}
                    isFormValid={isFormValid}
                    isSubmitting={isSubmitting}
                    isLoadingArtists={false}
                    progressStep={isSubmitting ? 'Uploading…' : null}
                    cancelTo="/app/library/albums"
                    showActions={false}
                    onUpdateTrack={updateTrack}
                    onRemoveTrack={removeTrack}
                    onClearTracks={clearAll}
                    onRequestCreateGenre={handleRequestCreateGenre}
                  />
                </>
              )}
            </div>

            <Separator className="shrink-0" />

            <div className="flex shrink-0 flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button asChild variant="secondary" type="button" className="min-w-32 sm:min-w-36">
                <Link to="/app/library/albums/$id" params={{ id: album.id }}>
                  Cancel
                </Link>
              </Button>
              <Button
                type="submit"
                disabled={!isFormValid || isSubmitting || tracks.length === 0}
                className="min-w-32 sm:min-w-36"
              >
                {isSubmitting ? (
                  <>
                    <CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <UploadSimpleIcon className="mr-2 h-4 w-4" />
                    Upload {tracks.length} track{tracks.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </form>
        </GlobalDropzone>
      </div>
    </div>
  );
}
