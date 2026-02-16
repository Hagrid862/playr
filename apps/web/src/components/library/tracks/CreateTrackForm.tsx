import { TextField } from '@/components/form';
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
import { Link } from '@tanstack/react-router';

interface CreateTrackFormProps {
  album: ZodAlbumInfer;
  isLoading: boolean;
  onSubmit: (values: CreateLibraryTrackRequest) => Promise<void>;
  serverErrors?: Partial<Record<keyof CreateLibraryTrackRequest, string>>;
}

const validateWithZod = (value: CreateLibraryTrackRequest) => {
  const result = CreateLibraryTrackRequestSchema.safeParse(value);
  if (result.success) return undefined;

  const errors: Record<string, string> = {};
  result.error.issues.forEach((issue) => {
    const path = issue.path.join('.') || 'form';
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  });
  return errors;
};

export function CreateTrackForm({
  album,
  isLoading,
  onSubmit,
  serverErrors,
}: CreateTrackFormProps) {
  const form = useForm({
    defaultValues: {
      title: '',
      trackNumber: 1,
      diskNumber: 1,
      explicit: false,
      albumId: album.id,
      artistIds: album.artists?.map((a) => a.id) ?? [],
    } as CreateLibraryTrackRequest,
    validators: {
      onBlur: ({ value }) => validateWithZod(value),
    },
    onSubmit: async ({ value }) => {
      await onSubmit(value);
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
      <div className="flex flex-col gap-6">
        <form.Field name="title">
          {(field) => (
            <TextField
              label="Track Title"
              placeholder="e.g. Smells Like Teen Spirit"
              value={field.state.value}
              error={
                field.state.meta.isTouched
                  ? (field.state.meta.errors[0] as unknown as string) ||
                    (form.state.errors[0] as Record<string, string>)?.[field.name]
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
                      ? (field.state.meta.errors[0] as unknown as string) ||
                        (form.state.errors[0] as Record<string, string>)?.[field.name]
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
                      ? (field.state.meta.errors[0] as unknown as string) ||
                        (form.state.errors[0] as Record<string, string>)?.[field.name]
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
      </div>

      <Separator />

      <div className="flex items-center justify-between gap-4">
        <Button asChild variant="secondary" type="button" className="min-w-32">
          <Link to="..">Cancel</Link>
        </Button>
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting] as const}
        >
          {([canSubmit, isSubmitting]) => (
            <Button
              type="submit"
              disabled={!canSubmit || isLoading || isSubmitting}
              className="min-w-32 group"
            >
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
    </form>
  );
}
