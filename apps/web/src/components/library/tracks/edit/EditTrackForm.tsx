import { TextField } from '@/components/form';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CheckIcon, CircleNotchIcon } from '@phosphor-icons/react';
import {
    UpdateLibraryTrackRequest,
    UpdateLibraryTrackRequestSchema,
    ZodTrack,
} from '@repo/contracts';
import { useForm } from '@tanstack/react-form';
import { Link, useNavigate } from '@tanstack/react-router';

interface EditTrackFormProps {
  track: ZodTrack;
  albumId: string;
  isLoading: boolean;
  onSubmit: (values: UpdateLibraryTrackRequest) => Promise<void>;
  serverErrors?: Partial<Record<keyof UpdateLibraryTrackRequest, string>>;
}

const validateWithZod = (value: UpdateLibraryTrackRequest) => {
  const result = UpdateLibraryTrackRequestSchema.safeParse(value);
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

export function EditTrackForm({
  track,
  albumId,
  isLoading,
  onSubmit,
  serverErrors,
}: EditTrackFormProps) {
  const navigate = useNavigate();

  const form = useForm({
    defaultValues: {
      title: track.title,
      trackNumber: track.trackNumber,
      diskNumber: track.diskNumber,
      explicit: track.explicit,
      artistIds: track.artists?.map((a) => a.id) ?? [],
    } as UpdateLibraryTrackRequest,
    validators: {
      onBlur: ({ value }) => validateWithZod(value),
    },
    onSubmit: async ({ value }) => {
      try {
        await onSubmit(value);
        navigate({ to: '/app/library/albums/$id', params: { id: albumId } });
      } catch (error) {
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
              value={field.state.value ?? ''}
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
                  placeholder="1"
                  type="number"
                  value={String(field.state.value ?? '')}
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
                  placeholder="1"
                  type="number"
                  value={String(field.state.value ?? '')}
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
      </div>

      <Separator />

      <div className="flex items-center justify-between gap-4">
        <Button asChild variant="secondary" type="button" className="min-w-32">
          <Link to="/app/library/albums/$id" params={{ id: albumId }}>
            Cancel
          </Link>
        </Button>
        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
          {([canSubmit, isSubmitting]) => (
            <Button
              type="submit"
              disabled={!canSubmit || isLoading || isSubmitting}
              className="min-w-32 group"
            >
              {isLoading || isSubmitting ? (
                <>
                  <CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckIcon className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
