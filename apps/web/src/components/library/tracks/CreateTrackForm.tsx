import { FileField, TextField } from '@/components/form';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CircleNotchIcon, PlusIcon } from '@phosphor-icons/react';
import {
  CreateLibraryTrackRequest,
  CreateLibraryTrackRequestSchema,
  ZodAlbumInfer,
} from '@repo/contracts';
import { useForm } from '@tanstack/react-form';
import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { z } from 'zod';

type TrackFormValues = CreateLibraryTrackRequest & { audioFile: File | null };

interface CreateTrackFormProps {
  album: ZodAlbumInfer;
  isLoading: boolean;
  onSubmit: (values: CreateLibraryTrackRequest, audioFile: File) => Promise<void>;
  serverErrors?: Partial<Record<keyof CreateLibraryTrackRequest, string>>;
}

const validateWithZod = (value: TrackFormValues) => {
  const metadata = {
    title: value.title,
    trackNumber: value.trackNumber,
    diskNumber: value.diskNumber,
    explicit: value.explicit,
    albumId: value.albumId,
    artistIds: value.artistIds,
  };
  const result = CreateLibraryTrackRequestSchema.safeParse(metadata);

  const errors: Partial<Record<keyof TrackFormValues | 'form', string>> = {};

  if (!result.success) {
    result.error.issues.forEach((issue) => {
      if (issue.path.length === 0) {
        errors.form = issue.message;
        return;
      }
      const path = issue.path.join('.') as keyof TrackFormValues;
      if (!errors[path]) {
        errors[path] = issue.message;
      }
    });
  }

  if (!value.audioFile) {
    errors.audioFile = 'Audio file is required';
  }

  return Object.keys(errors).length > 0 ? errors : undefined;
};

export function CreateTrackForm({
  album,
  isLoading,
  onSubmit,
  serverErrors,
}: CreateTrackFormProps) {
  const navigate = useNavigate();
  const [stayOnPage, setStayOnPage] = useState(false);

  const form = useForm({
    defaultValues: {
      title: '',
      trackNumber: 1,
      diskNumber: 1,
      explicit: false,
      albumId: album.id,
      artistIds: album.artists?.map((a) => a.id) ?? [],
      audioFile: null,
    } as TrackFormValues,
    validators: {
      onBlur: ({ value }) => validateWithZod(value),
      onChange: ({ value }) => validateWithZod(value),
      onSubmit: ({ value }) => validateWithZod(value),
    },
    onSubmit: async ({ value }) => {
      try {
        const metadata = CreateLibraryTrackRequestSchema.parse(value);
        const audioFile = z.instanceof(File).parse(value.audioFile);

        await onSubmit(metadata, audioFile);
        if (stayOnPage) {
          form.reset();
          form.setFieldValue('trackNumber', value.trackNumber + 1);
          form.setFieldValue('diskNumber', value.diskNumber);
        } else {
          navigate({ to: '..' });
        }
      } catch (error) {
        // Error handling is managed by the onSubmit prop/caller
        console.error('Submission failed:', error);
      }
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="flex flex-col gap-8"
    >
      <form.Subscribe selector={(state) => state.errors}>
        {(errors) => {
          const error = (errors?.[0] as Record<string, string> | undefined)?.form;
          return error ? <div className="text-destructive text-sm font-medium">{error}</div> : null;
        }}
      </form.Subscribe>
      <div className="flex flex-col gap-6">
        <form.Field name="title">
          {(field) => (
            <TextField
              label="Track Title"
              placeholder="e.g. Smells Like Teen Spirit"
              value={field.state.value}
              error={
                field.state.meta.isTouched
                  ? (field.state.meta.errors[0] as string | undefined) ||
                    (form.state.errors[0] as Record<string, string> | undefined)?.[field.name]
                  : serverErrors?.title
              }
              onChange={field.handleChange}
              onBlur={field.handleBlur}
            />
          )}
        </form.Field>

        <div className="flex gap-4">
          <form.Field name="diskNumber">
            {(field) => (
              <div className="w-24">
                <TextField
                  label="Disk No."
                  // @ts-expect-error TextField types are too strict
                  type="number"
                  value={String(field.state.value)}
                  error={
                    field.state.meta.isTouched
                      ? (field.state.meta.errors[0] as string | undefined) ||
                        (form.state.errors[0] as Record<string, string> | undefined)?.[field.name]
                      : serverErrors?.diskNumber
                  }
                  onChange={(e) => field.handleChange(Number(e))}
                  onBlur={field.handleBlur}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="trackNumber">
            {(field) => (
              <div className="flex-1">
                <TextField
                  label="Track No."
                  // @ts-expect-error TextField types are too strict
                  type="number"
                  value={String(field.state.value)}
                  error={
                    field.state.meta.isTouched
                      ? (field.state.meta.errors[0] as string | undefined) ||
                        (form.state.errors[0] as Record<string, string> | undefined)?.[field.name]
                      : serverErrors?.trackNumber
                  }
                  onChange={(e) => field.handleChange(Number(e))}
                  onBlur={field.handleBlur}
                />
              </div>
            )}
          </form.Field>
        </div>

        <form.Field name="explicit">
          {(field) => (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="explicit"
                checked={field.state.value}
                onCheckedChange={(checked) => field.handleChange(!!checked)}
              />
              <Label htmlFor="explicit">Explicit Content</Label>
            </div>
          )}
        </form.Field>

        <form.Field name="audioFile">
          {(field) => (
            <FileField
              label="Audio File"
              accept="audio/*"
              error={
                (field.state.meta.errors[0] as string | undefined) ||
                (form.state.errors[0] as Record<string, string> | undefined)?.[field.name]
              }
              onChange={(file) => field.handleChange(file)}
              onBlur={field.handleBlur}
            />
          )}
        </form.Field>
      </div>

      <Separator />

      <div className="flex items-center justify-between gap-4">
        <Button asChild variant="secondary" type="button" className="min-w-32">
          <Link to="..">Cancel</Link>
        </Button>
        <div className="flex items-center gap-6">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="stayOnPage"
              checked={stayOnPage}
              onCheckedChange={(checked) => setStayOnPage(!!checked)}
            />
            <Label htmlFor="stayOnPage" className="text-sm">
              Add another track
            </Label>
          </div>
          <form.Subscribe selector={(state) => [state.isSubmitting] as const}>
            {([isSubmitting]) => (
              <Button type="submit" disabled={isLoading || isSubmitting} className="min-w-32 group">
                {isLoading || isSubmitting ? (
                  <>
                    <CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <PlusIcon className="mr-2 h-4 w-4 transition-transform group-hover:rotate-90" />
                    Add Track
                  </>
                )}
              </Button>
            )}
          </form.Subscribe>
        </div>
      </div>
    </form>
  );
}
