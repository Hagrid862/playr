import { DatePickerField, SelectField, TextAreaField, TextField } from '@/components/form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  CameraIcon,
  CircleNotchIcon,
  FloppyDiskIcon,
  MusicNotesIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import {
  UpdateLibraryAlbumRequest,
  UpdateLibraryAlbumRequestSchema,
  ZodAlbum,
} from '@repo/contracts';
import { AlbumType } from '@repo/db';
import { useForm } from '@tanstack/react-form';
import { useEffect, useRef, useState } from 'react';

interface EditAlbumFormProps {
  album: ZodAlbum;
  isLoading: boolean;
  serverErrors?: Partial<Record<keyof UpdateLibraryAlbumRequest, string>>;
  onSubmit: (
    values: UpdateLibraryAlbumRequest,
    cover?: File,
    shouldDeleteCover?: boolean,
  ) => Promise<void>;
  onCancel: () => void;
}

const albumTypeOptions = Object.entries(AlbumType).map(([key, value]) => ({
  value,
  label: key.charAt(0).toUpperCase() + key.slice(1),
}));

const validateWithZod = (value: UpdateLibraryAlbumRequest) => {
  const result = UpdateLibraryAlbumRequestSchema.safeParse(value);
  if (result.success) return undefined;

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = String(issue.path[0]);
    errors[path] ??= issue.message;
  }
  return errors;
};

export function EditAlbumForm({
  album,
  isLoading,
  serverErrors,
  onSubmit,
  onCancel,
}: EditAlbumFormProps) {
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [coverPreview, setCoverPreview] = useState<string | undefined>(undefined);
  const [selectedCover, setSelectedCover] = useState<File | undefined>(undefined);
  const [isCoverRemoved, setIsCoverRemoved] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const [isFormatModalOpen, setIsFormatModalOpen] = useState(false);
  const [isMultipleFilesModalOpen, setIsMultipleFilesModalOpen] = useState(false);

  const form = useForm({
    defaultValues: {
      name: album.name,
      description: album.description || '',
      type: album.type,
      releaseDate: album.releaseDate || null,
      coverId: album.coverId || undefined,
    } satisfies UpdateLibraryAlbumRequest,
    validators: {
      onChange: ({ value }) => validateWithZod(value),
    },
    onSubmit: async ({ value }) => {
      await onSubmit(
        { ...value, coverId: isCoverRemoved ? null : value.coverId },
        selectedCover,
        isCoverRemoved,
      );
    },
  });

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedCover(file);
      setCoverPreview(URL.createObjectURL(file));
      setIsCoverRemoved(false);
    } else {
      setSelectedCover(undefined);
      setCoverPreview(undefined);
    }
  };

  const handleRemoveCover = () => {
    setSelectedCover(undefined);
    setCoverPreview(undefined);
    setIsCoverRemoved(true);
    // Safe: the file input is always rendered, so the ref is always attached

    coverInputRef.current!.value = '';
  };

  useEffect(() => {
    let dragCounter = 0;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter++;
      if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter === 0) {
        setIsDragging(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter = 0;
      setIsDragging(false);

      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        if (e.dataTransfer.files.length > 1) {
          setIsMultipleFilesModalOpen(true);
          return;
        }

        const file = e.dataTransfer.files[0];
        if (file.type.startsWith('image/')) {
          setSelectedCover(file);
          setCoverPreview(URL.createObjectURL(file));
          setIsCoverRemoved(false);

          if (coverInputRef.current) {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            coverInputRef.current.files = dataTransfer.files;
          }
        } else {
          setIsFormatModalOpen(true);
        }
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  const currentCoverUrl = coverPreview || (!isCoverRemoved ? album.cover?.url : undefined);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="flex flex-col gap-8"
    >
      <input
        type="file"
        ref={coverInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleCoverSelect}
      />

      {/* Hero section — cover art with glow + title field */}
      <div className="flex flex-col md:flex-row gap-8 md:gap-10">
        {/* Cover art */}
        <div className="flex flex-col items-center gap-3 shrink-0">
          <div className="relative">
            {/* Glow behind the cover */}
            {currentCoverUrl && (
              <img
                src={currentCoverUrl}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 size-40 rounded-2xl object-cover blur-xl opacity-40 scale-105 translate-y-2 saturate-150 pointer-events-none"
              />
            )}
            <div
              className="group relative size-40 rounded-2xl bg-stone-900 border-2 border-stone-700/60 flex items-center justify-center overflow-hidden hover:border-primary/50 transition-all cursor-pointer shadow-xl"
              onClick={() => coverInputRef.current?.click()}
            >
              {currentCoverUrl ? (
                <img
                  src={currentCoverUrl}
                  alt={album.name}
                  className="size-full object-cover group-hover:opacity-60 transition-opacity"
                />
              ) : (
                <MusicNotesIcon
                  size={44}
                  className="text-muted-foreground group-hover:text-primary transition-colors"
                  weight="duotone"
                />
              )}
              <div className="absolute inset-0 bg-stone-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <div className="flex flex-col items-center gap-1.5">
                  <CameraIcon size={22} className="text-white" />
                  <span className="text-[9px] font-bold text-white uppercase tracking-widest">
                    {currentCoverUrl ? 'Change Cover' : 'Upload Cover'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {currentCoverUrl ? (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={handleRemoveCover}
              className="text-xs text-muted-foreground hover:text-red-400 gap-1"
            >
              <TrashIcon size={12} />
              Remove
            </Button>
          ) : (
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
              Artwork
            </span>
          )}
        </div>

        {/* Title + description alongside cover */}
        <div className="flex-1 flex flex-col gap-5">
          <form.Field name="name">
            {(field) => (
              <TextField
                label="Album Title"
                placeholder="e.g. Nevermind"
                value={field.state.value || ''}
                error={
                  (field.state.meta.isTouched && field.state.meta.errors.length > 0
                    ? String(field.state.meta.errors[0])
                    : undefined) ||
                  (field.state.meta.isTouched && form.state.errors.length > 0
                    ? (form.state.errors[0] as Record<string, string>)?.[field.name]
                    : undefined) ||
                  serverErrors?.name
                }
                onChange={field.handleChange}
                onBlur={field.handleBlur}
              />
            )}
          </form.Field>

          <form.Field
            name="description"
            validators={{
              onChange: ({ value }) => {
                if (value && value.length > 2048) {
                  return 'Description must be 2048 characters or less';
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <TextAreaField
                label="Description"
                placeholder="Tell something about this album..."
                value={field.state.value || ''}
                error={
                  field.state.meta.isTouched
                    ? String(field.state.meta.errors[0] || '') ||
                      (form.state.errors[0] as Record<string, string>)?.[field.name]
                    : serverErrors?.description
                }
                onChange={field.handleChange}
                onBlur={field.handleBlur}
                className="min-h-28"
              />
            )}
          </form.Field>
        </div>
      </div>

      <Separator className="opacity-50" />

      {/* Metadata section */}
      <div>
        <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider mb-4">
          Metadata
        </h3>
        <div className="grid gap-5 md:grid-cols-2">
          <form.Field name="type">
            {(field) => (
              <SelectField
                label="Album Type"
                placeholder="Select type"
                value={field.state.value}
                options={albumTypeOptions}
                onChange={(value) => {
                  if (value in AlbumType) {
                    field.handleChange(value as AlbumType);
                  }
                }}
                onBlur={field.handleBlur}
              />
            )}
          </form.Field>

          <form.Field name="releaseDate">
            {(field) => (
              <DatePickerField
                label="Release Date"
                value={field.state.value ? new Date(field.state.value) : undefined}
                onChange={(date) => {
                  const isoValue = date?.toISOString() ?? null;
                  field.handleChange(isoValue as typeof field.state.value);
                }}
                onBlur={field.handleBlur}
              />
            )}
          </form.Field>
        </div>
      </div>

      <Separator className="opacity-50" />

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="ghost" type="button" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="min-w-32 group rounded-xl">
          {isLoading ? (
            <>
              <CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <FloppyDiskIcon size={18} className="mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Global Drag Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm border-2 border-dashed border-primary/50 m-4 rounded-3xl">
          <div className="flex flex-col items-center gap-4 text-primary pointer-events-none">
            <div className="p-4 bg-primary/20 rounded-full animate-pulse">
              <CameraIcon size={48} weight="duotone" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Drop cover image here</h2>
            <p className="text-muted-foreground">The image will be set as the album cover</p>
          </div>
        </div>
      )}

      {/* Invalid Format Modal */}
      <Dialog open={isFormatModalOpen} onOpenChange={setIsFormatModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invalid File Format</DialogTitle>
            <DialogDescription>
              Please upload an image file (e.g. JPG, PNG, WEBP) for the album cover.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Multiple Files Modal */}
      <Dialog open={isMultipleFilesModalOpen} onOpenChange={setIsMultipleFilesModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Too Many Files</DialogTitle>
            <DialogDescription>
              Please upload only one image file at a time for the album cover.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
