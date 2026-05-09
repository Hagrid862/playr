import { TextField } from '@/components/form';
import { AlbumAudioDropCard } from '@/components/library/albums/create/AlbumAudioDropCard';
import { CreateLibraryArtistNameModal } from '@/components/library/albums/create/CreateLibraryArtistNameModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useLibraryArtists } from '@/hooks/api/library-artists/useLibraryArtists';
import { useLibraryStore } from '@/stores/library.store';
import { CircleNotchIcon, TrashIcon, XIcon } from '@phosphor-icons/react';
import type { BulkTrackItem } from '@/lib/types/library';
import type { ZodTrack } from '@repo/contracts';
import { useCallback, useMemo, useRef, useState } from 'react';
import { AlbumTrackArtistsPicker, type AlbumArtistOption } from './AlbumTrackArtistsPicker';
import type { EditAlbumTracksController, EditAlbumTrackDraft } from './useEditAlbumTracks';
import { LibraryAlbumGenrePicker } from '../create/LibraryAlbumGenrePicker';
import type { ZodGenreInfer } from '@repo/contracts';
import {
  LIBRARY_ALBUM_GENRE_CREATE_VALUE,
  LIBRARY_ALBUM_GENRE_NONE_VALUE,
} from '../create/libraryAlbumGenreConstants';

function ExistingTrackEditCard({
  track,
  draft,
  artistOptions,
  genres,
  pendingGenres,
  isLoadingGenres,
  onUpdate,
  onScheduleDelete,
  onRequestCreateArtist,
  onRequestCreateGenre,
}: {
  track: ZodTrack;
  draft: EditAlbumTrackDraft;
  artistOptions: AlbumArtistOption[];
  genres: ZodGenreInfer[];
  pendingGenres: { id: string; name: string }[];
  isLoadingGenres: boolean;
  onUpdate: (patch: Partial<EditAlbumTrackDraft>) => void;
  onScheduleDelete: () => void;
  onRequestCreateArtist: () => void;
  onRequestCreateGenre: (onCreated: (genreId: string) => void) => void;
}) {
  return (
    <Card className="m-px">
      <CardHeader className="flex flex-row items-start justify-between gap-2 border-b pb-3">
        <CardTitle className="line-clamp-2 text-sm font-medium" title={track.title}>
          {track.title}
        </CardTitle>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={onScheduleDelete}
          aria-label="Remove track on save"
        >
          <TrashIcon size={16} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <TextField
          label="Track Title"
          placeholder="e.g. Song title"
          value={draft.title}
          onChange={(v) => onUpdate({ title: v })}
          onBlur={() => {}}
        />
        <div className="flex gap-4">
          <div className="w-24">
            <TextField
              label="Disk No."
              placeholder="1"
              type="number"
              value={String(draft.diskNumber)}
              onChange={(v) => onUpdate({ diskNumber: Number(v) || 1 })}
              onBlur={() => {}}
            />
          </div>
          <div className="flex-1">
            <TextField
              label="Track No."
              placeholder="1"
              type="number"
              value={String(draft.trackNumber)}
              onChange={(v) => onUpdate({ trackNumber: Number(v) || 1 })}
              onBlur={() => {}}
            />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id={`ex-${track.id}`}
            checked={draft.explicit}
            onCheckedChange={(c) => onUpdate({ explicit: !!c })}
          />
          <Label htmlFor={`ex-${track.id}`}>Explicit Content</Label>
        </div>
        <AlbumTrackArtistsPicker
          artists={artistOptions}
          value={draft.artistIds}
          onChange={(ids) => onUpdate({ artistIds: ids })}
          allowCreateNew
          onRequestCreateNew={onRequestCreateArtist}
        />
        <LibraryAlbumGenrePicker
          label="Track Genres"
          selectedGenreIds={draft.genreIds}
          genres={genres}
          pendingGenres={pendingGenres}
          isLoading={isLoadingGenres}
          onSelect={(value) => {
            if (value === LIBRARY_ALBUM_GENRE_CREATE_VALUE) {
              onRequestCreateGenre((gid) => {
                onUpdate({ genreIds: [...draft.genreIds, gid] });
              });
              return;
            }
            if (value === LIBRARY_ALBUM_GENRE_NONE_VALUE) {
              onUpdate({ genreIds: [] });
              return;
            }
            const nextIds = draft.genreIds.includes(value)
              ? draft.genreIds.filter((id) => id !== value)
              : [...draft.genreIds, value];
            onUpdate({ genreIds: nextIds });
          }}
        />
      </CardContent>
    </Card>
  );
}

function StagedTrackCard({
  track,
  fileName,
  artistOptions,
  genres,
  pendingGenres,
  isLoadingGenres,
  isBusy,
  onUpdate,
  onRemove,
  onRequestCreateArtist,
  onRequestCreateGenre,
}: {
  track: BulkTrackItem;
  fileName: string;
  artistOptions: AlbumArtistOption[];
  genres: ZodGenreInfer[];
  pendingGenres: { id: string; name: string }[];
  isLoadingGenres: boolean;
  isBusy: boolean;
  onUpdate: (updates: Partial<Omit<BulkTrackItem, 'id' | 'file'>>) => void;
  onRemove: () => void;
  onRequestCreateArtist: () => void;
  onRequestCreateGenre: (onCreated: (genreId: string) => void) => void;
}) {
  return (
    <Card className="m-px">
      <CardHeader className="flex flex-row items-start justify-between gap-2 border-b pb-3">
        <CardTitle className="truncate text-sm font-medium" title={fileName}>
          {fileName}
        </CardTitle>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          disabled={isBusy}
          aria-label="Remove staged track"
        >
          <TrashIcon size={16} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <TextField
          label="Track Title"
          placeholder="e.g. Song title"
          value={track.title}
          onChange={(v) => onUpdate({ title: v })}
          onBlur={() => {}}
        />
        <div className="flex gap-4">
          <div className="w-24">
            <TextField
              label="Disk No."
              placeholder="1"
              type="number"
              value={String(track.diskNumber)}
              onChange={(v) => onUpdate({ diskNumber: Number(v) || 1 })}
              onBlur={() => {}}
            />
          </div>
          <div className="flex-1">
            <TextField
              label="Track No."
              placeholder="1"
              type="number"
              value={String(track.trackNumber)}
              onChange={(v) => onUpdate({ trackNumber: Number(v) || 1 })}
              onBlur={() => {}}
            />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id={`st-ex-${track.id}`}
            checked={track.explicit}
            onCheckedChange={(c) => onUpdate({ explicit: !!c })}
            disabled={isBusy}
          />
          <Label htmlFor={`st-ex-${track.id}`}>Explicit Content</Label>
        </div>
        <AlbumTrackArtistsPicker
          artists={artistOptions}
          value={track.artistIds ?? []}
          onChange={(ids) => onUpdate({ artistIds: ids })}
          disabled={isBusy}
          allowCreateNew
          onRequestCreateNew={onRequestCreateArtist}
        />
        <LibraryAlbumGenrePicker
          label="Track Genres"
          selectedGenreIds={track.genreIds ?? []}
          genres={genres}
          pendingGenres={pendingGenres}
          isLoading={isLoadingGenres}
          onSelect={(value) => {
            if (value === LIBRARY_ALBUM_GENRE_CREATE_VALUE) {
              onRequestCreateGenre((gid) => {
                onUpdate({ genreIds: [...(track.genreIds ?? []), gid] });
              });
              return;
            }
            if (value === LIBRARY_ALBUM_GENRE_NONE_VALUE) {
              onUpdate({ genreIds: [] });
              return;
            }
            const current = track.genreIds ?? [];
            const nextIds = current.includes(value)
              ? current.filter((id) => id !== value)
              : [...current, value];
            onUpdate({ genreIds: nextIds });
          }}
        />
      </CardContent>
    </Card>
  );
}

interface EditAlbumTracksSectionProps {
  tracks: EditAlbumTracksController;
  genres: ZodGenreInfer[];
  pendingGenres: { id: string; name: string }[];
  isLoadingGenres: boolean;
  onRequestCreateGenre: (onCreated: (genreId: string) => void) => void;
}

export function EditAlbumTracksSection({
  tracks,
  genres,
  pendingGenres,
  isLoadingGenres,
  onRequestCreateGenre,
}: EditAlbumTracksSectionProps) {
  useLibraryArtists(1, 100);
  const privateArtists = useLibraryStore((s) => s.privateArtists);

  const [createArtistModalOpen, setCreateArtistModalOpen] = useState(false);
  const afterCreateArtistRef = useRef<((localId: string) => void) | null>(null);

  const {
    sortedExistingActive,
    tracksMarkedForDeletion,
    draftById,
    updateDraft,
    scheduleTrackDelete,
    undoTrackDelete,
    stagedTracks,
    addAudioFiles,
    updateStagedTrack,
    removeStagedTrack,
    clearStagedTracks,
    isScanningMetadata,
    pendingArtists,
    registerPendingArtist,
    removePendingArtist,
  } = tracks;

  const artistOptions: AlbumArtistOption[] = useMemo(() => {
    const pendingOpts = pendingArtists.map((p) => ({
      id: p.id,
      label: `${p.name} (new)`,
    }));
    const serverOpts = privateArtists.map((a) => ({ id: a.id, label: a.name }));
    return [...pendingOpts, ...serverOpts];
  }, [pendingArtists, privateArtists]);

  const allowEmptyArtistList = artistOptions.length > 0;

  const openCreateArtistModal = useCallback((assign: (localId: string) => void) => {
    afterCreateArtistRef.current = assign;
    setCreateArtistModalOpen(true);
  }, []);

  const handleConfirmNewArtistName = useCallback(
    (name: string) => {
      const localId = registerPendingArtist(name);
      afterCreateArtistRef.current?.(localId);
      afterCreateArtistRef.current = null;
    },
    [registerPendingArtist],
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-6">
      <CreateLibraryArtistNameModal
        open={createArtistModalOpen}
        onOpenChange={setCreateArtistModalOpen}
        pendingArtistNames={pendingArtists.map((p) => p.name)}
        onConfirm={handleConfirmNewArtistName}
      />

      {pendingArtists.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground">New artists (saved with album):</span>
          {pendingArtists.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs"
            >
              {p.name}
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-muted"
                aria-label={`Remove ${p.name}`}
                onClick={() => removePendingArtist(p.id)}
              >
                <XIcon className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Audio files</h3>
        <p className="text-xs text-muted-foreground">
          New files are uploaded when you click Save changes at the bottom.
        </p>
        <AlbumAudioDropCard
          fileInputRef={fileInputRef}
          onAddFiles={addAudioFiles}
          compact={stagedTracks.length > 0}
        />
      </div>

      {isScanningMetadata && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CircleNotchIcon className="h-4 w-4 animate-spin" />
          Scanning metadata…
        </div>
      )}

      {stagedTracks.length > 0 && (
        <>
          <Separator />
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-medium">New tracks ({stagedTracks.length})</h3>
              <Button type="button" variant="ghost" size="sm" onClick={clearStagedTracks}>
                Clear staged
              </Button>
            </div>
            <div className="flex flex-col gap-3">
              {stagedTracks.map((t) => (
                <StagedTrackCard
                  key={t.id}
                  track={t}
                  fileName={t.file.name}
                  artistOptions={artistOptions}
                  genres={genres}
                  pendingGenres={pendingGenres}
                  isLoadingGenres={isLoadingGenres}
                  isBusy={isScanningMetadata}
                  onUpdate={(u) => updateStagedTrack(t.id, u)}
                  onRemove={() => removeStagedTrack(t.id)}
                  onRequestCreateArtist={() =>
                    openCreateArtistModal((lid) =>
                      updateStagedTrack(t.id, {
                        artistIds: [...(t.artistIds ?? []), lid],
                      }),
                    )
                  }
                  onRequestCreateGenre={onRequestCreateGenre}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {tracksMarkedForDeletion.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <p className="mb-2 font-medium text-destructive">Marked for removal on save</p>
          <ul className="flex flex-col gap-1">
            {tracksMarkedForDeletion.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2">
                <span className="truncate">{t.title}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => undoTrackDelete(t.id)}
                >
                  Undo
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Separator />

      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-medium">Album tracks ({sortedExistingActive.length})</h3>
        {!allowEmptyArtistList && stagedTracks.length === 0 && sortedExistingActive.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Load library artists or add a new artist from a track’s artist picker.
          </p>
        ) : null}
        {sortedExistingActive.length === 0 && stagedTracks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tracks on this album yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {sortedExistingActive.map((t) => {
              const draft = draftById[t.id];
              if (!draft) return null;
              return (
                <ExistingTrackEditCard
                  key={t.id}
                  track={t}
                  draft={draft}
                  artistOptions={artistOptions}
                  genres={genres}
                  pendingGenres={pendingGenres}
                  isLoadingGenres={isLoadingGenres}
                  onUpdate={(patch) => updateDraft(t.id, patch)}
                  onScheduleDelete={() => scheduleTrackDelete(t.id)}
                  onRequestCreateArtist={() =>
                    openCreateArtistModal((lid) =>
                      updateDraft(t.id, { artistIds: [...draft.artistIds, lid] }),
                    )
                  }
                  onRequestCreateGenre={onRequestCreateGenre}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
