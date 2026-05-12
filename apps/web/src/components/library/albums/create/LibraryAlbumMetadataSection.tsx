import { DatePickerField, SelectField, TextAreaField, TextField } from '@/components/form';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ZodGenreInfer } from '@repo/contracts';
import { AlbumType } from '@repo/db';
import { Link } from '@tanstack/react-router';
import { CameraIcon, MusicNotesIcon, TrashIcon, XIcon } from '@phosphor-icons/react';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { LibraryAlbumArtistPicker } from './LibraryAlbumArtistPicker';
import { LibraryAlbumGenrePicker } from './LibraryAlbumGenrePicker';
import { isLocalPendingArtistId } from './pendingLibraryArtist';
import { isLocalPendingGenreId } from './pendingLibraryGenre';
import type { LibraryAlbumFromFilesFormData } from './useLibraryAlbumFromFilesForm';
import { LIBRARY_ALBUM_ARTIST_NONE_VALUE } from './libraryAlbumArtistConstants';

const albumTypeOptions = Object.entries(AlbumType).map(([key, value]) => ({
  value,
  label: key.charAt(0).toUpperCase() + key.slice(1),
}));

interface LibraryAlbumMetadataSectionProps {
  formData: LibraryAlbumFromFilesFormData;
  /** Server-loaded artists (for empty-state copy). */
  artists: { id: string; name: string }[];
  isLoadingArtists: boolean;
  pendingArtists: { id: string; name: string }[];
  /** Manual upload and/or embedded track cover — what to show in the artwork tile */
  coverPreviewUrl: string | null;
  onUpdate: <K extends keyof LibraryAlbumFromFilesFormData>(
    field: K,
    value: LibraryAlbumFromFilesFormData[K],
  ) => void;
  onManualCoverFile: (file: File | null) => void;
  /** Clears manual file if set, otherwise clears embedded cover selection */
  onRemoveCover: () => void;
  /** Genres from the library (system + custom), for empty-state copy and picker. */
  genres: ZodGenreInfer[];
  pendingGenres: { id: string; name: string }[];
  isLoadingGenres: boolean;
  onGenreSelectionChange: (value: string) => void;
  onRemoveGenreId: (genreId: string) => void;
  onArtistSelectionChange: (value: string) => void;
  onRemoveArtistId: (artistId: string) => void;
}

export function LibraryAlbumMetadataSection({
  formData,
  artists,
  isLoadingArtists,
  pendingArtists,
  coverPreviewUrl,
  onUpdate,
  onManualCoverFile,
  onRemoveCover,
  genres,
  pendingGenres,
  isLoadingGenres,
  onGenreSelectionChange,
  onRemoveGenreId,
  onArtistSelectionChange,
  onRemoveArtistId,
}: LibraryAlbumMetadataSectionProps) {
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [isFormatModalOpen, setIsFormatModalOpen] = useState(false);
  const [isMultipleFilesModalOpen, setIsMultipleFilesModalOpen] = useState(false);

  useEffect(() => {
    if (!coverPreviewUrl && coverInputRef.current) {
      coverInputRef.current.value = '';
    }
  }, [coverPreviewUrl]);

  const applyImageFile = useCallback(
    (file: File | null) => {
      if (!file) {
        onManualCoverFile(null);
        return;
      }
      if (file.type.startsWith('image/')) {
        onManualCoverFile(file);
        /* v8 ignore start -- ref is attached before any user-driven handler runs */
        if (coverInputRef.current) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          coverInputRef.current.files = dataTransfer.files;
        }
        /* v8 ignore stop */
      } else {
        setIsFormatModalOpen(true);
      }
    },
    [onManualCoverFile],
  );

  const handleCoverInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] ?? null;
      applyImageFile(file);
    },
    [applyImageFile],
  );

  const handleCoverDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!e.dataTransfer?.files?.length) return;
      if (e.dataTransfer.files.length > 1) {
        setIsMultipleFilesModalOpen(true);
        return;
      }
      applyImageFile(e.dataTransfer.files[0] ?? null);
    },
    [applyImageFile],
  );

  const handleCoverDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const genreIdsForChips = useMemo(
    () =>
      [...formData.genreIds].sort((a, b) => {
        const aNew = isLocalPendingGenreId(a);
        const bNew = isLocalPendingGenreId(b);
        if (aNew === bNew) return 0;
        return aNew ? -1 : 1;
      }),
    [formData.genreIds],
  );

  const artistIdsForChips = useMemo(
    () =>
      [...formData.artistIds].sort((a, b) => {
        const aNew = isLocalPendingArtistId(a);
        const bNew = isLocalPendingArtistId(b);
        if (aNew === bNew) return 0;
        return aNew ? -1 : 1;
      }),
    [formData.artistIds],
  );

  const hasOnlyPendingArtists =
    formData.artistIds.length > 0 && formData.artistIds.every((id) => isLocalPendingArtistId(id));

  return (
    <div className="flex flex-col gap-6 overflow-visible lg:max-h-full lg:min-h-0 lg:flex-1">
      <Dialog open={isMultipleFilesModalOpen} onOpenChange={setIsMultipleFilesModalOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Too many files</DialogTitle>
            <DialogDescription>
              Use one image file for the album cover, or pick covers from your uploaded tracks
              below.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" onClick={() => setIsMultipleFilesModalOpen(false)}>
                OK
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isFormatModalOpen} onOpenChange={setIsFormatModalOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Invalid file format</DialogTitle>
            <DialogDescription>
              Drop an image file (JPG, PNG, WebP, etc.) for the album cover.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" onClick={() => setIsFormatModalOpen(false)}>
                OK
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex shrink-0 flex-col gap-6">
        <h3 className="text-sm font-medium">Album details</h3>

        <div className="flex flex-col gap-8 overflow-visible md:flex-row md:gap-10">
          <div className="flex shrink-0 flex-col items-center gap-3 overflow-visible">
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverInputChange}
            />
            <div className="relative shrink-0 overflow-visible">
              {coverPreviewUrl && (
                <img
                  src={coverPreviewUrl}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 size-40 rounded-2xl object-cover blur-lg opacity-35 scale-100 translate-y-4 saturate-150 pointer-events-none"
                />
              )}
              <div
                role="button"
                tabIndex={0}
                className="group relative flex size-40 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-stone-700/60 bg-stone-900 shadow-xl transition-all hover:border-primary/50"
                onClick={() => coverInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    coverInputRef.current?.click();
                  }
                }}
                onDrop={handleCoverDrop}
                onDragOver={handleCoverDragOver}
              >
                {coverPreviewUrl ? (
                  <img
                    src={coverPreviewUrl}
                    alt={formData.name || 'Cover preview'}
                    className="size-full rounded-[13px] object-cover transition-opacity group-hover:opacity-60"
                  />
                ) : (
                  <MusicNotesIcon
                    size={44}
                    className="text-muted-foreground transition-colors group-hover:text-primary"
                    weight="duotone"
                  />
                )}
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[13px] bg-stone-950/60 opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="flex flex-col items-center gap-1.5">
                    <CameraIcon size={22} className="text-white" />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-white">
                      {coverPreviewUrl ? 'Change cover' : 'Upload cover'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            {coverPreviewUrl ? (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => {
                  onRemoveCover();
                }}
                className="gap-1 text-xs text-muted-foreground hover:text-red-400"
              >
                <TrashIcon size={12} />
                Remove
              </Button>
            ) : (
              <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                Artwork
              </span>
            )}
          </div>

          <div className="flex flex-1 flex-col gap-6">
            <TextField
              label="Album title"
              placeholder="e.g. Nevermind"
              value={formData.name}
              onChange={(value) => onUpdate('name', value)}
              onBlur={() => {}}
            />
            <TextAreaField
              label="Description"
              placeholder="Tell something about this album..."
              value={formData.description || ''}
              onChange={(value) => onUpdate('description', value)}
              onBlur={() => {}}
              className="min-h-32"
            />
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-6 lg:overflow-y-auto lg:pr-1">
        <div className="space-y-2">
          {hasOnlyPendingArtists ? (
            <ArtistPendingOnlyNotice
              onClearAll={() => onArtistSelectionChange(LIBRARY_ALBUM_ARTIST_NONE_VALUE)}
            />
          ) : null}
          <LibraryAlbumArtistPicker
            selectedArtistIds={formData.artistIds}
            artists={artists}
            pendingArtists={pendingArtists}
            isLoading={isLoadingArtists}
            disabled={isLoadingArtists}
            nonePlaceholder={artists.length === 0 ? 'No artists or create new' : 'No artists'}
            onSelect={onArtistSelectionChange}
          />
          {formData.artistIds.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {artistIdsForChips.map((aid) => {
                const pending = pendingArtists.find((p) => p.id === aid);
                const a = artists.find((x) => x.id === aid);
                const label = pending ? `${pending.name} (new)` : (a?.name ?? aid);
                const isNewArtist = isLocalPendingArtistId(aid);
                return (
                  <Button
                    key={aid}
                    type="button"
                    variant="secondary"
                    size="sm"
                    className={cn(
                      'h-7 gap-1 pr-1 pl-2 text-xs font-normal',
                      isNewArtist &&
                        'border border-emerald-600/45 bg-emerald-500/15 text-emerald-950 hover:bg-emerald-500/25 dark:border-emerald-500/40 dark:bg-emerald-950/55 dark:text-emerald-100 dark:hover:bg-emerald-900/45',
                    )}
                    onClick={() => onRemoveArtistId(aid)}
                    aria-label={`Remove ${label}`}
                  >
                    <span className="max-w-[10rem] truncate">{label}</span>
                    <XIcon className="size-3.5 shrink-0 opacity-70" />
                  </Button>
                );
              })}
            </div>
          ) : null}
          {!isLoadingArtists && artists.length === 0 && formData.artistIds.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Choose <span className="font-medium text-foreground">Create new artist…</span> above,
              or{' '}
              <Link to="/app/library/artists/create" className="text-primary hover:underline">
                add an artist separately
              </Link>
              .
            </p>
          )}
        </div>

        <div className="space-y-2">
          <LibraryAlbumGenrePicker
            selectedGenreIds={formData.genreIds}
            genres={genres}
            pendingGenres={pendingGenres}
            isLoading={isLoadingGenres}
            disabled={isLoadingGenres}
            nonePlaceholder={genres.length === 0 ? 'No genres or create new' : 'No genres'}
            onSelect={onGenreSelectionChange}
          />
          {formData.genreIds.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {genreIdsForChips.map((gid) => {
                const pending = pendingGenres.find((p) => p.id === gid);
                const g = genres.find((x) => x.id === gid);
                const label = pending ? `${pending.name} (new)` : (g?.name ?? gid);
                const isNewGenre = isLocalPendingGenreId(gid);
                return (
                  <Button
                    key={gid}
                    type="button"
                    variant="secondary"
                    size="sm"
                    className={cn(
                      'h-7 gap-1 pr-1 pl-2 text-xs font-normal',
                      isNewGenre &&
                        'border border-emerald-600/45 bg-emerald-500/15 text-emerald-950 hover:bg-emerald-500/25 dark:border-emerald-500/40 dark:bg-emerald-950/55 dark:text-emerald-100 dark:hover:bg-emerald-900/45',
                    )}
                    onClick={() => onRemoveGenreId(gid)}
                    aria-label={`Remove ${label}`}
                  >
                    <span className="max-w-[10rem] truncate">{label}</span>
                    <XIcon className="size-3.5 shrink-0 opacity-70" />
                  </Button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Album type"
            placeholder="Select type"
            value={formData.type}
            options={albumTypeOptions}
            onChange={(value) => onUpdate('type', value as typeof formData.type)}
            onBlur={() => {}}
          />
          <DatePickerField
            label="Release date"
            value={formData.releaseDate ?? undefined}
            onChange={(date) => onUpdate('releaseDate', date ?? null)}
            onBlur={() => {}}
          />
        </div>
      </div>
    </div>
  );
}

function ArtistPendingOnlyNotice({ onClearAll }: { onClearAll: () => void }) {
  const noticeId = useId();
  return (
    <Field>
      <FieldLabel className="sr-only" htmlFor={noticeId}>
        Draft artists notice
      </FieldLabel>
      <div className="flex w-full overflow-visible rounded-lg border border-input bg-background dark:bg-input/30">
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              id={noticeId}
              className="inline-flex min-h-8 min-w-0 flex-1 cursor-default items-center px-2.5 py-1.5 text-xs text-muted-foreground"
              tabIndex={0}
            >
              Selected artists are drafts not in your library yet. Remove a draft from the chips
              above to change your selection.
            </span>
          </TooltipTrigger>
          <TooltipContent sideOffset={4} className="max-w-xs">
            Create the album to save these artists to your library, or clear drafts to pick existing
            artists.
          </TooltipContent>
        </Tooltip>
        <Button
          type="button"
          variant="destructive"
          size="icon"
          aria-label="Clear all draft artists"
          onClick={onClearAll}
          className="h-8 w-8 shrink-0 rounded-none border-0 border-l border-input hover:bg-destructive/20 dark:border-input"
        >
          <XIcon className="size-4" />
        </Button>
      </div>
    </Field>
  );
}
