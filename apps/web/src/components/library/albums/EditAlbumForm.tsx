import { DatePickerField, SelectField, TextAreaField, TextField } from '@/components/form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CameraIcon, CircleNotchIcon, FloppyDiskIcon, MusicNotesIcon } from '@phosphor-icons/react';
import {
  UpdateLibraryAlbumRequest,
  UpdateLibraryAlbumRequestSchema,
  ZodAlbum,
} from '@repo/contracts';
import { AlbumType } from '@repo/db';
import { useForm } from '@tanstack/react-form';
import { useRef, useState } from 'react';

interface EditAlbumFormProps {
  album: ZodAlbum;
  isLoading: boolean;
  serverErrors?: Partial<Record<keyof UpdateLibraryAlbumRequest, string>>;
  onSubmit: (values: UpdateLibraryAlbumRequest, cover?: File) => Promise<void>;
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
  result.error.issues.forEach((issue) => {
    const path = issue.path[0] as string;
    if (path && !errors[path]) {
      errors[path] = issue.message;
    }
  });
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

  const form = useForm({
    defaultValues: {
      name: album.name,
      description: album.description || '',
      type: album.type || AlbumType.album,
      releaseDate: album.releaseDate || null,
    } satisfies UpdateLibraryAlbumRequest,
    validators: {
      onChange: ({ value }) => validateWithZod(value),
    },
    onSubmit: async ({ value }) => {
      await onSubmit(value, selectedCover);
    },
  });

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedCover(file);
      setCoverPreview(URL.createObjectURL(file));
    } else {
      setSelectedCover(undefined);
      setCoverPreview(undefined);
    }
  };

  const currentCoverUrl = coverPreview || album.cover?.url;

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

      <div className="grid gap-8">
        {/* Cover Art Section */}
        <Card className="border-border/50 bg-stone-900/10 backdrop-blur-sm overflow-hidden">
          <CardHeader>
            <CardTitle>Cover Art</CardTitle>
            <CardDescription>Update your album cover artwork.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <div
                className="group relative size-48 rounded-2xl bg-stone-900 border-4 border-stone-800 flex items-center justify-center overflow-hidden hover:border-primary/50 transition-all cursor-pointer shadow-2xl"
                onClick={() => coverInputRef.current?.click()}
              >
                {currentCoverUrl ? (
                  <img
                    src={currentCoverUrl}
                    alt={album.name}
                    className="size-full object-cover group-hover:opacity-50 transition-opacity"
                  />
                ) : (
                  <MusicNotesIcon
                    size={48}
                    className="text-muted-foreground group-hover:text-primary transition-colors"
                    weight="duotone"
                  />
                )}
                <div className="absolute inset-0 bg-stone-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <div className="flex flex-col items-center gap-2">
                    <CameraIcon size={24} className="text-white" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">
                      {currentCoverUrl ? 'Change Cover' : 'Upload Cover'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details Section */}
        <Card className="border-border/50 bg-stone-900/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Album Details</CardTitle>
            <CardDescription>Manage your album title, description, and metadata.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
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
                  className="max-w-md"
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
                  className="min-h-32"
                />
              )}
            </form.Field>

            <div className="grid gap-6 md:grid-cols-2">
              <form.Field name="type">
                {(field) => (
                  <SelectField
                    label="Album Type"
                    placeholder="Select type"
                    value={field.state.value || AlbumType.album}
                    options={albumTypeOptions}
                    error={
                      field.state.meta.isTouched && field.state.meta.errors.length > 0
                        ? String(field.state.meta.errors[0])
                        : undefined
                    }
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
                    error={
                      field.state.meta.isTouched && field.state.meta.errors.length > 0
                        ? String(field.state.meta.errors[0])
                        : undefined
                    }
                    onChange={(date) => {
                      const isoValue = date?.toISOString() ?? null;
                      field.handleChange(isoValue as typeof field.state.value);
                    }}
                    onBlur={field.handleBlur}
                  />
                )}
              </form.Field>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/50">
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
    </form>
  );
}
