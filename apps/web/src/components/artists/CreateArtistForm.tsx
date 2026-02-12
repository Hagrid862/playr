import { TextAreaField, TextField } from '@/components/form';
import { Button } from '@/components/ui/button';
import { CameraIcon, CircleNotchIcon, PlusIcon } from '@phosphor-icons/react';
import { CreateArtistRequest, CreateArtistRequestSchema } from '@repo/contracts';
import { useForm } from '@tanstack/react-form';
import { Link } from '@tanstack/react-router';
import { CardContent, CardFooter } from '../ui/card';

interface CreateArtistFormProps {
  isLoading: boolean;
  serverErrors?: Partial<Record<keyof CreateArtistRequest, string>>;
  onSubmit: (values: CreateArtistRequest) => Promise<void>;
}

/**
 * Zod validation helper for TanStack Form.
 * Maps Zod issues to the flat error object format expected by form-level validators.
 */
const validateWithZod = (value: CreateArtistRequest) => {
  const result = CreateArtistRequestSchema.safeParse(value);
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

export function CreateArtistForm({ isLoading, serverErrors, onSubmit }: CreateArtistFormProps) {
  const form = useForm({
    defaultValues: {
      name: '',
      description: '',
    } as CreateArtistRequest,
    validators: {
      onChange: ({ value }) => validateWithZod(value),
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
      <CardContent>
        <div className="flex flex-col md:flex-row gap-10">
          <div className="flex flex-col items-center gap-3">
            <div className="group relative w-32 h-32 rounded-full bg-stone-800 border-2 border-dashed border-border flex items-center justify-center overflow-hidden hover:border-primary/50 transition-colors cursor-pointer">
              <CameraIcon
                size={40}
                className="text-muted-foreground group-hover:text-primary transition-colors"
                weight="duotone"
              />
              <div className="absolute inset-0 bg-stone-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[10px] text-white font-medium uppercase tracking-wider">
                Upload Photo
              </div>
            </div>
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
              Avatar
            </span>
          </div>

          <div className="flex-1 flex flex-col gap-4">
            <form.Field name="name">
              {(field) => (
                <TextField
                  label="Artist Name"
                  placeholder="e.g. Kurt Cobain"
                  value={field.state.value}
                  error={
                    field.state.meta.isTouched
                      ? (field.state.meta.errors[0] as unknown as string) ||
                        (form.state.errors[0] as Record<string, string>)?.[field.name]
                      : serverErrors?.name
                  }
                  onChange={field.handleChange}
                  onBlur={field.handleBlur}
                />
              )}
            </form.Field>

            <form.Field
              name="description"
              validators={{
                onChange: ({ value }) =>
                  (value?.length || 0) > 2048
                    ? 'Description must be 2048 characters or less'
                    : undefined,
              }}
            >
              {(field) => (
                <TextAreaField
                  label="Description"
                  placeholder="Tell something about the artist..."
                  value={field.state.value || ''}
                  error={
                    field.state.meta.isTouched
                      ? (field.state.meta.errors[0] as unknown as string) ||
                        (form.state.errors[0] as Record<string, string>)?.[field.name]
                      : serverErrors?.description
                  }
                  onChange={field.handleChange}
                  onBlur={field.handleBlur}
                  className="min-h-32"
                />
              )}
            </form.Field>
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting, state.values.name] as const}
        >
          {([canSubmit, isSubmitting, name]) => (
            <div className="flex items-center justify-between w-full">
              <Button asChild variant="secondary" type="button" className="min-w-32">
                <Link to="/app/library/artists">Cancel</Link>
              </Button>
              <Button
                type="submit"
                disabled={Boolean(
                  !canSubmit || isLoading || isSubmitting || !name || name.length === 0,
                )}
                className="min-w-32 group"
              >
                {isLoading || isSubmitting ? (
                  <>
                    <CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <PlusIcon className="mr-2 h-4 w-4 transition-transform group-hover:rotate-90" />
                    Create Artist
                  </>
                )}
              </Button>
            </div>
          )}
        </form.Subscribe>
      </CardFooter>
    </form>
  );
}
