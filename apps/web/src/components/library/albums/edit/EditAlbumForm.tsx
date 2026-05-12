import { Button } from '@/components/ui/button';
import { GlobalDropzone } from '@/components/ui/GlobalDropzone';
import { Separator } from '@/components/ui/separator';
import { CircleNotchIcon, FloppyDiskIcon } from '@phosphor-icons/react';
import type { UpdateLibraryAlbumRequest, ZodAlbum, ZodGenreInfer } from '@repo/contracts';
import { EditAlbumHero } from './EditAlbumHero';
import { EditAlbumMetadata } from './EditAlbumMetadata';
import { EditAlbumModals } from './EditAlbumModals';
import { EditAlbumTracksSection } from './EditAlbumTracksSection';
import type { EditAlbumTracksSubmitPayload } from './useEditAlbumTracks';
import { useEditAlbumTracks } from './useEditAlbumTracks';
import { useEditAlbumForm } from './useEditAlbumForm';
import { useCreateLibraryArtist } from '@/hooks/api/library-artists/useCreateLibraryArtist';
import { useLibraryArtists } from '@/hooks/api/library-artists/useLibraryArtists';
import { useCreateLibraryGenre } from '@/hooks/api/library-genres/useCreateLibraryGenre';
import { useLibraryGenres } from '@/hooks/api/library-genres/useLibraryGenres';
import { useLibraryStore } from '@/stores/library.store';
import {
  applyPendingArtistMapToEditPayload,
  buildPendingArtistLocalToServerMap,
  collectPendingArtistIdsForAlbumSubmit,
  mergePendingArtistDrafts,
} from '@/components/library/albums/resolvePendingArtistsForSubmit';
import {
  applyPendingGenreMapToEditPayload,
  buildPendingGenreLocalToServerMap,
  collectPendingGenreIdsForAlbumSubmit,
} from '@/components/library/albums/resolvePendingGenresForSubmit';
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  LIBRARY_ALBUM_GENRE_CREATE_VALUE,
  LIBRARY_ALBUM_GENRE_NONE_VALUE,
} from '../create/libraryAlbumGenreConstants';
import {
  LIBRARY_ALBUM_ARTIST_CREATE_VALUE,
  LIBRARY_ALBUM_ARTIST_NONE_VALUE,
} from '../create/libraryAlbumArtistConstants';
import { makeLocalPendingArtistId } from '../create/pendingLibraryArtist';
import { makeLocalPendingGenreId } from '../create/pendingLibraryGenre';
import { CreateLibraryArtistNameModal } from '../create/CreateLibraryArtistNameModal';
import { CreateLibraryGenreNameModal } from '../create/CreateLibraryGenreNameModal';

interface EditAlbumFormProps {
  album: ZodAlbum;
  isLoading: boolean;
  serverErrors?: Partial<Record<keyof UpdateLibraryAlbumRequest, string>>;
  onSubmit: (
    values: UpdateLibraryAlbumRequest,
    tracks: EditAlbumTracksSubmitPayload,
    cover?: File,
    shouldDeleteCover?: boolean,
    extras?: { pendingGenres: { id: string; name: string }[] },
  ) => Promise<void>;
  onCancel: () => void;
  /** @internal When true, cover input is not rendered. Used by tests to cover ref-null branch. */
  _testHideCoverInput?: boolean;
}

export function EditAlbumForm({
  album,
  isLoading,
  serverErrors,
  onSubmit,
  onCancel,
  _testHideCoverInput = false,
}: EditAlbumFormProps) {
  const { data: genresResponse, isLoading: isLoadingGenres } = useLibraryGenres({
    page: 1,
    limit: 100,
  });
  const genres = useMemo<ZodGenreInfer[]>(
    () => genresResponse?.data?.items ?? [],
    [genresResponse],
  );

  const { isLoading: isLoadingArtists } = useLibraryArtists();
  const artists = useLibraryStore((state) => state.privateArtists);

  const { mutateAsync: createLibraryGenre } = useCreateLibraryGenre();
  const { mutateAsync: createLibraryArtist } = useCreateLibraryArtist();

  const [createGenreModalOpen, setCreateGenreModalOpen] = useState(false);
  const [createArtistModalOpen, setCreateArtistModalOpen] = useState(false);
  const [pendingGenres, setPendingGenres] = useState<{ id: string; name: string }[]>([]);
  const [pendingAlbumArtists, setPendingAlbumArtists] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [activeGenreCreationCallback, setActiveGenreCreationCallback] = useState<
    ((genreId: string) => void) | null
  >(null);

  const tracksState = useEditAlbumTracks(album);

  const onSubmitWithResolvedPending = useCallback(
    async (
      values: UpdateLibraryAlbumRequest,
      tracksPayload: EditAlbumTracksSubmitPayload,
      cover?: File,
      shouldDeleteCover?: boolean,
    ) => {
      let nextValues = values;
      let nextTracks = tracksPayload;

      const pendingGenresNeeded = collectPendingGenreIdsForAlbumSubmit(
        nextValues.genreIds,
        nextTracks,
      );
      if (pendingGenresNeeded.size > 0) {
        const genreMap = await buildPendingGenreLocalToServerMap(
          pendingGenresNeeded,
          pendingGenres,
          createLibraryGenre,
        );
        const appliedGenres = applyPendingGenreMapToEditPayload(nextValues, nextTracks, genreMap);
        nextValues = appliedGenres.values;
        nextTracks = appliedGenres.tracks;
      }

      const visibleAlbumPending = pendingAlbumArtists.filter((p) =>
        (nextValues.artistIds ?? []).includes(p.id),
      );
      const combinedPendingArtists = mergePendingArtistDrafts(
        visibleAlbumPending,
        tracksState.pendingArtists,
      );
      const pendingArtistsNeeded = collectPendingArtistIdsForAlbumSubmit(
        nextValues.artistIds,
        nextTracks,
      );
      if (pendingArtistsNeeded.size > 0) {
        const artistMap = await buildPendingArtistLocalToServerMap(
          pendingArtistsNeeded,
          combinedPendingArtists,
          createLibraryArtist,
        );
        const appliedArtists = applyPendingArtistMapToEditPayload(
          nextValues,
          nextTracks,
          artistMap,
        );
        nextValues = appliedArtists.values;
        nextTracks = appliedArtists.tracks;
      }

      await onSubmit(nextValues, nextTracks, cover, shouldDeleteCover, { pendingGenres });
    },
    [
      createLibraryArtist,
      createLibraryGenre,
      onSubmit,
      pendingAlbumArtists,
      pendingGenres,
      tracksState.pendingArtists,
    ],
  );

  const {
    form,
    coverInputRef,
    currentCoverUrl,
    handleFiles,
    handleRemoveCover,
    isFormatModalOpen,
    setIsFormatModalOpen,
    isMultipleFilesModalOpen,
    setIsMultipleFilesModalOpen,
    handleCoverSelect,
  } = useEditAlbumForm({
    album,
    onSubmit: onSubmitWithResolvedPending,
    prepareTracksSubmit: tracksState.prepareTracksSubmit,
  });

  const readGenreIdsSnapshot = () => form.getFieldValue('genreIds');
  const genreIds = useSyncExternalStore(
    (onStoreChange) => {
      const sub = form.store.subscribe(() => {
        onStoreChange();
      });
      return () => sub.unsubscribe();
    },
    readGenreIdsSnapshot,
    readGenreIdsSnapshot,
  );
  const visiblePendingGenres = useMemo(
    () => pendingGenres.filter((p) => genreIds.includes(p.id)),
    [pendingGenres, genreIds],
  );

  const readArtistIdsSnapshot = () => form.getFieldValue('artistIds') as string[];
  const artistIds = useSyncExternalStore(
    (onStoreChange) => {
      const sub = form.store.subscribe(() => {
        onStoreChange();
      });
      return () => sub.unsubscribe();
    },
    readArtistIdsSnapshot,
    readArtistIdsSnapshot,
  );
  const visiblePendingAlbumArtists = useMemo(
    () => pendingAlbumArtists.filter((p) => artistIds.includes(p.id)),
    [pendingAlbumArtists, artistIds],
  );

  useEffect(() => {
    setPendingAlbumArtists((prev) => prev.filter((p) => artistIds.includes(p.id)));
  }, [artistIds]);

  const handleArtistSelectionChange = useCallback(
    (value: string) => {
      if (value === LIBRARY_ALBUM_ARTIST_CREATE_VALUE) {
        setCreateArtistModalOpen(true);
        return;
      }

      const currentIds = form.getFieldValue('artistIds') as string[];
      let nextIds: string[];

      if (value === LIBRARY_ALBUM_ARTIST_NONE_VALUE) {
        nextIds = [];
      } else {
        nextIds = currentIds.includes(value)
          ? currentIds.filter((id: string) => id !== value)
          : [...currentIds, value];
      }

      form.setFieldValue('artistIds', nextIds);
      tracksState.updateAllTracksArtists(currentIds, nextIds);
    },
    [form, tracksState],
  );

  const handleConfirmNewArtistName = useCallback(
    (name: string) => {
      const id = makeLocalPendingArtistId();
      setPendingAlbumArtists((prev) => [...prev, { id, name }]);
      const currentIds = form.getFieldValue('artistIds') as string[];
      const nextIds = [...currentIds, id];
      form.setFieldValue('artistIds', nextIds);
      tracksState.updateAllTracksArtists(currentIds, nextIds);
    },
    [form, tracksState],
  );

  const handleRemoveArtistId = useCallback(
    (id: string) => {
      const currentIds = form.getFieldValue('artistIds') as string[];
      const nextIds = currentIds.filter((x) => x !== id);
      form.setFieldValue('artistIds', nextIds);
      tracksState.updateAllTracksArtists(currentIds, nextIds);
    },
    [form, tracksState],
  );

  const handleGenreSelectionChange = useCallback(
    (value: string) => {
      if (value === LIBRARY_ALBUM_GENRE_CREATE_VALUE) {
        setCreateGenreModalOpen(true);
        return;
      }

      const currentIds = form.getFieldValue('genreIds');
      let nextIds: string[];

      if (value === LIBRARY_ALBUM_GENRE_NONE_VALUE) {
        nextIds = [];
      } else {
        nextIds = currentIds.includes(value)
          ? currentIds.filter((id: string) => id !== value)
          : [...currentIds, value];
      }

      form.setFieldValue('genreIds', nextIds);
      tracksState.updateAllTracksGenres(currentIds, nextIds);
    },
    [form, tracksState],
  );

  const handleConfirmNewGenreName = useCallback(
    (name: string) => {
      const id = makeLocalPendingGenreId();
      setPendingGenres((prev) => [...prev, { id, name }]);

      if (activeGenreCreationCallback) {
        activeGenreCreationCallback(id);
        setActiveGenreCreationCallback(null);
      } else {
        const currentIds = form.getFieldValue('genreIds');
        const nextIds = [...currentIds, id];
        form.setFieldValue('genreIds', nextIds);
        tracksState.updateAllTracksGenres(currentIds, nextIds);
      }
    },
    [activeGenreCreationCallback, form, tracksState],
  );

  const handleRequestCreateGenre = useCallback((onCreated: (genreId: string) => void) => {
    setActiveGenreCreationCallback(() => onCreated);
    setCreateGenreModalOpen(true);
  }, []);

  return (
    <GlobalDropzone
      onDrop={handleFiles}
      overlayTitle="Drop cover image here"
      overlayDescription="Release to upload the artwork"
      className="relative flex min-h-0 w-full flex-1 flex-col overflow-visible"
    >
      <EditAlbumModals
        isFormatModalOpen={isFormatModalOpen}
        setIsFormatModalOpen={setIsFormatModalOpen}
        isMultipleFilesModalOpen={isMultipleFilesModalOpen}
        setIsMultipleFilesModalOpen={setIsMultipleFilesModalOpen}
      />

      <CreateLibraryArtistNameModal
        open={createArtistModalOpen}
        onOpenChange={setCreateArtistModalOpen}
        pendingArtistNames={visiblePendingAlbumArtists.map((p) => p.name)}
        onConfirm={handleConfirmNewArtistName}
      />

      <CreateLibraryGenreNameModal
        open={createGenreModalOpen}
        onOpenChange={(open) => {
          setCreateGenreModalOpen(open);
          if (!open) setActiveGenreCreationCallback(null);
        }}
        onConfirm={handleConfirmNewGenreName}
        pendingGenreNames={visiblePendingGenres.map((p) => p.name)}
        existingGenres={genres}
      />

      <div className="relative flex w-full min-w-0 flex-col gap-6 lg:min-h-0 lg:flex-1 lg:flex-col overflow-visible">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="flex w-full min-w-0 flex-col gap-6 lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-visible"
        >
          {!_testHideCoverInput && (
            <input
              type="file"
              ref={coverInputRef}
              className="hidden"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleCoverSelect(file);
              }}
            />
          )}

          <div className="flex w-full min-w-0 flex-col gap-6 lg:min-h-0 lg:flex-1 lg:flex-row lg:items-stretch lg:gap-8 xl:gap-12 2xl:gap-16 overflow-visible">
            <aside className="flex w-full shrink-0 flex-col overflow-visible lg:max-h-full lg:min-h-0 lg:w-[min(100%,24rem)] lg:overscroll-contain lg:px-3 xl:w-[min(100%,28rem)] 2xl:w-[30rem]">
              <div className="flex flex-col gap-6 overflow-visible lg:max-h-full lg:min-h-0 lg:flex-1">
                <div className="flex shrink-0 flex-col gap-6">
                  <h3 className="text-sm font-medium">Album details</h3>
                  <EditAlbumHero
                    form={form}
                    currentCoverUrl={currentCoverUrl}
                    albumName={album.name}
                    onCoverClick={() => coverInputRef.current?.click()}
                    onRemoveCover={handleRemoveCover}
                    serverErrors={serverErrors as Record<string, string>}
                  />
                </div>

                <div className="min-h-0 flex-1 space-y-6 lg:overflow-y-auto lg:pr-1">
                  <EditAlbumMetadata
                    form={form}
                    artists={artists}
                    pendingArtists={visiblePendingAlbumArtists}
                    isLoadingArtists={isLoadingArtists}
                    genres={genres}
                    pendingGenres={visiblePendingGenres}
                    isLoadingGenres={isLoadingGenres}
                    onGenreSelect={handleGenreSelectionChange}
                    onArtistSelect={handleArtistSelectionChange}
                    onRemoveArtistId={handleRemoveArtistId}
                  />
                </div>
              </div>
            </aside>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:min-h-0 lg:border-l lg:border-border/60 lg:pl-8 xl:pl-12 2xl:pl-16">
              <div className="flex flex-col gap-6 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-2 xl:pr-3">
                <Separator className="lg:hidden" />
                <EditAlbumTracksSection
                  tracks={tracksState}
                  genres={genres}
                  pendingGenres={visiblePendingGenres}
                  isLoadingGenres={isLoadingGenres}
                  onRequestCreateGenre={handleRequestCreateGenre}
                />
              </div>
            </div>
          </div>

          <Separator className="shrink-0 lg:mt-0" />

          <div className="flex shrink-0 flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="secondary"
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="min-w-32 sm:min-w-36"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="min-w-32 sm:min-w-36">
              {isLoading ? (
                <>
                  <CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <FloppyDiskIcon size={18} className="mr-2" />
                  Save changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </GlobalDropzone>
  );
}
