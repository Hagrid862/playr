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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { AlbumType } from '@repo/db';
import { Link } from '@tanstack/react-router';
import { CameraIcon, MusicNotesIcon, TrashIcon, XIcon } from '@phosphor-icons/react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { LibraryAlbumFromFilesFormData } from './useLibraryAlbumFromFilesForm';

const albumTypeOptions = Object.entries(AlbumType).map(([key, value]) => ({
  value,
  label: key.charAt(0).toUpperCase() + key.slice(1),
}));

interface LibraryAlbumMetadataSectionProps {
  formData: LibraryAlbumFromFilesFormData;
  /** Server-loaded artists (for empty-state copy). */
  artists: { id: string; name: string }[];
  /** Options for the artist select, including “Create new…” and any client-only pending artists. */
  artistSelectOptions: { value: string; label: string }[];
  isLoadingArtists: boolean;
  /** Client-only staged new artist (`local:pending:…`) is selected — artist row uses fused readonly select + clear. */
  isStagedNewArtistSelected: boolean;
  /** Manual upload and/or embedded track cover — what to show in the artwork tile */
  coverPreviewUrl: string | null;
  onUpdate: <K extends keyof LibraryAlbumFromFilesFormData>(
    field: K,
    value: LibraryAlbumFromFilesFormData[K],
  ) => void;
  /** Artist field only; used to open “create artist” without writing a sentinel `artistId`. */
  onArtistIdChange: (value: string) => void;
  /** Clear staged new artist and reset artist selection. */
  onClearStagedArtist: () => void;
  onManualCoverFile: (file: File | null) => void;
  /** Clears manual file if set, otherwise clears embedded cover selection */
  onRemoveCover: () => void;
}

export function LibraryAlbumMetadataSection({
  formData,
  artists,
  artistSelectOptions,
  isLoadingArtists,
  isStagedNewArtistSelected,
  coverPreviewUrl,
  onUpdate,
  onArtistIdChange,
  onClearStagedArtist,
  onManualCoverFile,
  onRemoveCover,
}: LibraryAlbumMetadataSectionProps) {
  const artistFieldId = useId();
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
        if (coverInputRef.current) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          coverInputRef.current.files = dataTransfer.files;
        }
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
        <div className="space-y-1">
        {isStagedNewArtistSelected ? (
          <Field>
            <FieldLabel htmlFor={artistFieldId}>Artist</FieldLabel>
            <div className="flex w-full overflow-visible rounded-lg border border-input bg-background dark:bg-input/30">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className="inline-flex min-w-0 flex-1 cursor-default outline-none"
                    tabIndex={0}
                  >
                    <Select
                      disabled
                      value={formData.artistId === '' ? undefined : formData.artistId}
                      onValueChange={onArtistIdChange}
                    >
                      <SelectTrigger
                        id={artistFieldId}
                        type="button"
                        disabled
                        className={cn(
                          'h-8 min-w-0 flex-1 rounded-none border-0 shadow-none disabled:cursor-not-allowed disabled:opacity-100',
                          'w-full bg-transparent hover:bg-transparent dark:bg-transparent dark:hover:bg-transparent',
                        )}
                        onBlur={() => {}}
                      >
                        <SelectValue
                          placeholder={
                            isLoadingArtists
                              ? 'Loading...'
                              : artists.length === 0
                                ? 'Create or select artist'
                                : 'Select artist'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        <SelectGroup>
                          {artistSelectOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </span>
                </TooltipTrigger>
                <TooltipContent sideOffset={4} className="max-w-xs">
                  This artist is not in your library yet. Remove the draft to pick a different
                  artist.
                </TooltipContent>
              </Tooltip>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                aria-label="Remove draft artist"
                onClick={onClearStagedArtist}
                className="h-8 w-8 shrink-0 rounded-none border-0 border-l border-input hover:bg-destructive/20 dark:border-input"
              >
                <XIcon className="size-4" />
              </Button>
            </div>
          </Field>
        ) : (
          <SelectField
            label="Artist"
            placeholder={
              isLoadingArtists
                ? 'Loading...'
                : artists.length === 0
                  ? 'Create or select artist'
                  : 'Select artist'
            }
            value={formData.artistId}
            options={artistSelectOptions}
            disabled={isLoadingArtists}
            onChange={onArtistIdChange}
            onBlur={() => {}}
          />
        )}
        {!isLoadingArtists && artists.length === 0 && !isStagedNewArtistSelected && (
          <p className="text-xs text-muted-foreground">
            Choose <span className="font-medium text-foreground">Create new artist…</span> above, or{' '}
            <Link to="/app/library/artists/create" className="text-primary hover:underline">
              add an artist separately
            </Link>
            .
          </p>
        )}
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
