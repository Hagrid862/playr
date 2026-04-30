import { TextAreaField, TextField } from '@/components/form';
import { Button } from '@/components/ui/button';
import { CameraIcon, MusicNotesIcon, TrashIcon } from '@phosphor-icons/react';
interface EditAlbumHeroProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any;
  currentCoverUrl?: string | null;
  albumName: string;
  onCoverClick: () => void;
  onRemoveCover: () => void;
  serverErrors?: Record<string, string>;
}

export function EditAlbumHero({
  form,
  currentCoverUrl,
  albumName,
  onCoverClick,
  onRemoveCover,
  serverErrors,
}: EditAlbumHeroProps) {
  return (
    <div className="flex flex-col md:flex-row gap-8 md:gap-10">
      <div className="flex flex-col items-center gap-3 shrink-0">
        <div className="relative">
          {currentCoverUrl && (
            <img
              src={currentCoverUrl}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 size-40 rounded-2xl object-cover blur-xl opacity-40 scale-105 translate-y-2 saturate-150 pointer-events-none"
            />
          )}
          <div
            className="group relative flex size-40 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-stone-700/60 bg-stone-900 shadow-xl transition-all hover:border-primary/50"
            onClick={onCoverClick}
          >
            {currentCoverUrl ? (
              <img
                src={currentCoverUrl}
                alt={albumName}
                className="size-full rounded-[13px] object-cover transition-opacity group-hover:opacity-60"
              />
            ) : (
              <MusicNotesIcon
                size={44}
                className="text-muted-foreground group-hover:text-primary transition-colors"
                weight="duotone"
              />
            )}
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[13px] bg-stone-950/60 opacity-0 transition-opacity group-hover:opacity-100">
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
            onClick={onRemoveCover}
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

      <div className="flex-1 flex flex-col gap-5">
        <form.Field name="name">
          {(field: {
            state: { value: string; meta: { isTouched: boolean; errors: unknown[] } };
            name: string;
            handleChange: (v: string) => void;
            handleBlur: () => void;
          }) => (
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
            onChange: ({ value }: { value: string }) => {
              if (value && value.length > 2048) {
                return 'Description must be 2048 characters or less';
              }
              return undefined;
            },
          }}
        >
          {(field: {
            state: { value: string; meta: { isTouched: boolean; errors: unknown[] } };
            name: string;
            handleChange: (v: string) => void;
            handleBlur: () => void;
          }) => (
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
  );
}
