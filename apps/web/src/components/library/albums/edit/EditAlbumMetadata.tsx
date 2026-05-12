import { Button } from '@/components/ui/button';
import { DatePickerField, SelectField } from '@/components/form';
import { AlbumType } from '@repo/db';
import { XIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { ZodGenreInfer } from '@repo/contracts';

import { LibraryAlbumArtistPicker } from '../create/LibraryAlbumArtistPicker';
import { LibraryAlbumGenrePicker } from '../create/LibraryAlbumGenrePicker';
import { isLocalPendingArtistId } from '../create/pendingLibraryArtist';

const albumTypeOptions = Object.entries(AlbumType).map(([key, value]) => ({
  value,
  label: key.charAt(0).toUpperCase() + key.slice(1),
}));

interface EditAlbumMetadataProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any;
  artists: { id: string; name: string }[];
  pendingArtists: { id: string; name: string }[];
  isLoadingArtists: boolean;
  genres: ZodGenreInfer[];
  pendingGenres: { id: string; name: string }[];
  isLoadingGenres: boolean;
  onGenreSelect: (value: string) => void;
  onArtistSelect: (value: string) => void;
  onRemoveArtistId: (id: string) => void;
}

export function EditAlbumMetadata({
  form,
  artists,
  pendingArtists,
  isLoadingArtists,
  genres,
  pendingGenres,
  isLoadingGenres,
  onGenreSelect,
  onArtistSelect,
  onRemoveArtistId,
}: EditAlbumMetadataProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <form.Field name="type">
        {(field: {
          state: { value: string };
          handleChange: (v: string) => void;
          handleBlur: () => void;
        }) => (
          <SelectField
            label="Album type"
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
        {(field: {
          state: { value: string | null };
          handleChange: (v: unknown) => void;
          handleBlur: () => void;
        }) => (
          <DatePickerField
            label="Release date"
            value={field.state.value ? new Date(field.state.value) : undefined}
            onChange={(date) => {
              const isoValue = date?.toISOString() ?? null;
              field.handleChange(isoValue as typeof field.state.value);
            }}
            onBlur={field.handleBlur}
          />
        )}
      </form.Field>

      <div className="sm:col-span-2 space-y-2">
        <form.Field name="artistIds">
          {(field: { state: { value: string[] } }) => {
            const sorted = [...field.state.value].sort((a, b) => {
              const aNew = isLocalPendingArtistId(a);
              const bNew = isLocalPendingArtistId(b);
              if (aNew === bNew) return 0;
              return aNew ? -1 : 1;
            });
            return (
              <>
                <LibraryAlbumArtistPicker
                  label="Artists"
                  selectedArtistIds={field.state.value}
                  artists={artists}
                  pendingArtists={pendingArtists}
                  isLoading={isLoadingArtists}
                  disabled={isLoadingArtists}
                  nonePlaceholder={
                    artists.length === 0 ? 'No artists or create new' : 'No artists'
                  }
                  onSelect={onArtistSelect}
                />
                {field.state.value.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {sorted.map((aid) => {
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
              </>
            );
          }}
        </form.Field>
      </div>

      <div className="sm:col-span-2">
        <form.Field name="genreIds">
          {(field: { state: { value: string[] } }) => (
            <LibraryAlbumGenrePicker
              selectedGenreIds={field.state.value}
              genres={genres}
              pendingGenres={pendingGenres}
              isLoading={isLoadingGenres}
              onSelect={onGenreSelect}
            />
          )}
        </form.Field>
      </div>
    </div>
  );
}
